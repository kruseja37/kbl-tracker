import { initMetaDatabase } from './franchiseManager';

export const FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY = 'franchisePhase2Activation';
export const FRANCHISE_PHASE2_ACTIVATION_RECORD_VERSION = 1;

export const FRANCHISE_PHASE2_FLAG_KEYS = [
  'morale',
  'fame',
  'flashpoint',
  'checkpoint',
  'traits',
  'l10',
  'l11',
  'l12',
  'l13',
  'l14',
  'stadiumRecords',
  'auctionAdvisorColor',
] as const;

export type FranchisePhase2FlagKey = (typeof FRANCHISE_PHASE2_FLAG_KEYS)[number];

export interface FranchisePhase2FlagDescriptor {
  key: FranchisePhase2FlagKey;
  label: string;
  detail: string;
}

export const FRANCHISE_PHASE2_FLAG_DESCRIPTORS: FranchisePhase2FlagDescriptor[] = [
  { key: 'morale', label: 'Morale', detail: 'Player and fan morale consequences.' },
  { key: 'fame', label: 'Fame', detail: 'Fame heat, reach floors, and status records.' },
  { key: 'flashpoint', label: 'Flashpoint', detail: 'Flashpoint decay and Albatross pressure.' },
  { key: 'checkpoint', label: 'Checkpoint', detail: 'Ratings development checkpoint overlays.' },
  { key: 'traits', label: 'Traits', detail: 'Earned trait detection and pending trait overlays.' },
  { key: 'l10', label: 'L10 Events', detail: 'Random-event sweep and pending overlays.' },
  { key: 'l11', label: 'L11 Managers', detail: 'Manager firing and manager-change consequences.' },
  { key: 'l12', label: 'L12 Honors', detail: 'Race, All-Star, awards, honor, and snub systems.' },
  { key: 'l13', label: 'L13 Relationships', detail: 'Relationship edges, rivalry morale, and matchup ties.' },
  { key: 'l14', label: 'L14 Rebrand', detail: 'Rebrand offer and cascade circuit breaker.' },
  { key: 'stadiumRecords', label: 'Stadium Records', detail: 'Park records and home-park rivals.' },
  { key: 'auctionAdvisorColor', label: 'Auction Advisor Color', detail: 'Low-frequency assistant GM draft moments.' },
];

export type FranchisePhase2FlagOverrides = Partial<Record<FranchisePhase2FlagKey, boolean>>;

export interface FranchisePhase2ActivationRecord {
  key: typeof FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY;
  version: typeof FRANCHISE_PHASE2_ACTIVATION_RECORD_VERSION;
  globalEnabled: boolean | null;
  flagOverrides: FranchisePhase2FlagOverrides;
  updatedAt: string;
}

const APP_SETTINGS_STORE = 'appSettings';

let cachedActivationRecord: FranchisePhase2ActivationRecord | null = null;

function isFlagKey(value: string): value is FranchisePhase2FlagKey {
  return (FRANCHISE_PHASE2_FLAG_KEYS as readonly string[]).includes(value);
}

function normalizeFlagOverrides(value: unknown): FranchisePhase2FlagOverrides {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  const output: FranchisePhase2FlagOverrides = {};
  for (const [key, enabled] of Object.entries(input)) {
    if (isFlagKey(key) && typeof enabled === 'boolean') {
      output[key] = enabled;
    }
  }
  return output;
}

function normalizeActivationRecord(value: unknown): FranchisePhase2ActivationRecord | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const maybeValue = input.value && typeof input.value === 'object'
    ? (input.value as Record<string, unknown>)
    : input;
  if (maybeValue.key !== FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY) return null;
  const globalEnabled =
    typeof maybeValue.globalEnabled === 'boolean' ? maybeValue.globalEnabled : null;
  return {
    key: FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY,
    version: FRANCHISE_PHASE2_ACTIVATION_RECORD_VERSION,
    globalEnabled,
    flagOverrides: normalizeFlagOverrides(maybeValue.flagOverrides),
    updatedAt: typeof maybeValue.updatedAt === 'string' ? maybeValue.updatedAt : new Date(0).toISOString(),
  };
}

export function getCachedFranchisePhase2ActivationRecord(): FranchisePhase2ActivationRecord | null {
  return cachedActivationRecord;
}

export function setCachedFranchisePhase2ActivationRecord(
  record: FranchisePhase2ActivationRecord | null,
): void {
  cachedActivationRecord = record;
}

export function resolveFranchisePhase2FlagActivation(
  flagKey: FranchisePhase2FlagKey,
  compiledDefault: boolean,
): boolean {
  const persistedOverride = cachedActivationRecord?.flagOverrides[flagKey];
  if (typeof persistedOverride === 'boolean') return persistedOverride;
  if (typeof cachedActivationRecord?.globalEnabled === 'boolean') {
    return cachedActivationRecord.globalEnabled;
  }
  return compiledDefault;
}

export async function hydrateFranchisePhase2ActivationCache(): Promise<FranchisePhase2ActivationRecord | null> {
  if (typeof indexedDB === 'undefined') {
    cachedActivationRecord = null;
    return null;
  }

  try {
    const db = await initMetaDatabase();
    const record = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(APP_SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(APP_SETTINGS_STORE);
      const request = store.get(FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
    cachedActivationRecord = normalizeActivationRecord(record);
    return cachedActivationRecord;
  } catch (error) {
    cachedActivationRecord = null;
    console.warn('[Phase2Activation] Failed to hydrate activation cache; flags remain compiled defaults.', error);
    return null;
  }
}

export async function saveFranchisePhase2ActivationRecord(
  input: Pick<FranchisePhase2ActivationRecord, 'globalEnabled' | 'flagOverrides'>,
): Promise<FranchisePhase2ActivationRecord> {
  const record: FranchisePhase2ActivationRecord = {
    key: FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY,
    version: FRANCHISE_PHASE2_ACTIVATION_RECORD_VERSION,
    globalEnabled: typeof input.globalEnabled === 'boolean' ? input.globalEnabled : null,
    flagOverrides: normalizeFlagOverrides(input.flagOverrides),
    updatedAt: new Date().toISOString(),
  };

  const db = await initMetaDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(APP_SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(APP_SETTINGS_STORE);
    const request = store.put({ key: FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY, value: record });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  cachedActivationRecord = record;
  return record;
}

export async function resetFranchisePhase2ActivationRecord(): Promise<void> {
  const db = await initMetaDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(APP_SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(APP_SETTINGS_STORE);
    const request = store.delete(FRANCHISE_PHASE2_ACTIVATION_SETTINGS_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  cachedActivationRecord = null;
}

export function resetFranchisePhase2ActivationCacheForTests(): void {
  cachedActivationRecord = null;
}
