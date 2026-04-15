import type {
  NarrativeIntensity,
  UserPreferences,
} from "../types/reporterPreferences";
import {
  DEFAULT_NARRATIVE_INTENSITY,
  DEFAULT_SOFT_MONTHLY_BUDGET,
} from "../types/reporterPreferences";
import { syncEngine } from "./syncEngine";
import { getTrackerDb } from "./trackerDb";

const STORE = "userPreferences";
const USER_PREFERENCES_KEY: UserPreferences["key"] = "default";

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

function createDefaultPreferences(now = Date.now()): UserPreferences {
  return {
    key: USER_PREFERENCES_KEY,
    narrativeIntensity: DEFAULT_NARRATIVE_INTENSITY,
    softMonthlyBudget: DEFAULT_SOFT_MONTHLY_BUDGET,
    lastModified: now,
  };
}

function assertNarrativeIntensity(value: NarrativeIntensity): void {
  if (!["low", "medium", "high"].includes(value)) {
    throw new Error(`Unsupported narrative intensity: ${value}`);
  }
}

export function validateGrokApiKey(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length >= 8 && !/\s/.test(trimmed);
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const stored = await requestToPromise<UserPreferences | undefined>(
    tx.objectStore(STORE).get(USER_PREFERENCES_KEY),
  );
  await transactionToPromise(tx);

  return stored ?? createDefaultPreferences();
}

export async function saveUserPreferences(
  preferences: Partial<Omit<UserPreferences, "key" | "lastModified">>,
): Promise<UserPreferences> {
  const current = await getUserPreferences();
  const next: UserPreferences = {
    ...current,
    ...preferences,
    key: USER_PREFERENCES_KEY,
    lastModified: Date.now(),
  };

  assertNarrativeIntensity(next.narrativeIntensity);

  if (!validateGrokApiKey(next.grokApiKey)) {
    throw new Error("Grok API key must be at least 8 characters and contain no whitespace.");
  }

  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  await requestToPromise(tx.objectStore(STORE).put(next));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", STORE, next.key, next);
  }

  return next;
}

export async function getNarrativeIntensity(): Promise<NarrativeIntensity> {
  return (await getUserPreferences()).narrativeIntensity;
}

export async function setNarrativeIntensity(
  narrativeIntensity: NarrativeIntensity,
): Promise<UserPreferences> {
  return saveUserPreferences({ narrativeIntensity });
}

export async function getGrokApiKey(): Promise<string | undefined> {
  return (await getUserPreferences()).grokApiKey;
}

export async function setGrokApiKey(grokApiKey: string | undefined): Promise<UserPreferences> {
  return saveUserPreferences({ grokApiKey: grokApiKey?.trim() || undefined });
}

export async function getSoftMonthlyBudget(): Promise<number> {
  return (await getUserPreferences()).softMonthlyBudget;
}

export async function setSoftMonthlyBudget(softMonthlyBudget: number): Promise<UserPreferences> {
  if (!Number.isFinite(softMonthlyBudget) || softMonthlyBudget < 0) {
    throw new Error("Soft monthly budget must be a non-negative number.");
  }

  return saveUserPreferences({ softMonthlyBudget });
}
