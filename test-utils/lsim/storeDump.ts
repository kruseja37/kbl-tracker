import type { LsimStoreDump } from './invariants/types';
import { L_SIM_IDS } from './sandbox';

const DUMP_DATABASES = [
  'kbl-tracker',
  'kbl-franchise-morale',
  'kbl-league-builder',
  'kbl-schedule',
  'kbl-event-log',
  'kbl-app-meta',
  'kbl-manager-identity',
  'kbl-franchise-stadium-records',
  'kbl-franchise-home-park-rivals',
  `kbl-franchise-${L_SIM_IDS.franchiseId}`,
] as const;

type Jsonish = null | boolean | number | string | Jsonish[] | { [key: string]: Jsonish };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stableClone(value: unknown): Jsonish {
  if (value === undefined) return null;
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => stableClone(entry));
  }
  if (isPlainObject(value)) {
    const output: Record<string, Jsonish> = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = stableClone(value[key]);
    }
    return output;
  }
  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableClone(value));
}

function digestString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${input.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function openExistingDatabase(name: string): Promise<IDBDatabase | null> {
  const introspector = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };
  if (typeof introspector.databases === 'function') {
    const databases = await introspector.databases();
    if (!databases.some((database) => database.name === name)) {
      return null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB database ${name}`));
    request.onblocked = () => reject(new Error(`Opening IndexedDB database ${name} was blocked`));
  });
}

async function dumpDatabase(name: string): Promise<Record<string, unknown[]>> {
  const db = await openExistingDatabase(name);
  if (!db) return {};

  try {
    const storeNames = Array.from(db.objectStoreNames).sort();
    if (storeNames.length === 0) return {};
    const tx = db.transaction(storeNames, 'readonly');
    const txDone = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(`Dump transaction failed for ${name}`));
      tx.onabort = () => reject(tx.error ?? new Error(`Dump transaction aborted for ${name}`));
    });
    const entries = await Promise.all(
      storeNames.map(async (storeName) => {
        const rows = await requestToPromise<unknown[]>(tx.objectStore(storeName).getAll());
        const sortedRows = rows
          .map((row) => stableClone(row))
          .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
        return [storeName, sortedRows] as const;
      }),
    );
    await txDone;
    return Object.fromEntries(entries);
  } finally {
    db.close();
  }
}

export async function dumpLsimStores(): Promise<LsimStoreDump> {
  const databases: Record<string, Record<string, unknown[]>> = {};
  const rowCounts: Record<string, number> = {};

  for (const dbName of DUMP_DATABASES) {
    const stores = await dumpDatabase(dbName);
    const nonEmptyStores = Object.entries(stores).filter(([, rows]) => rows.length > 0);
    if (nonEmptyStores.length === 0) continue;
    databases[dbName] = Object.fromEntries(nonEmptyStores);
    for (const [storeName, rows] of nonEmptyStores) {
      rowCounts[`${dbName}.${storeName}`] = rows.length;
    }
  }

  const serialized = stableStringify(databases);
  return {
    databases,
    rowCounts,
    digest: digestString(serialized),
  };
}

function describeValue(value: unknown): string {
  const text = stableStringify(value);
  return text.length <= 180 ? text : `${text.slice(0, 177)}...`;
}

function firstJsonDifference(left: unknown, right: unknown, pathLabel = '$'): string | null {
  if (stableStringify(left) === stableStringify(right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return `${pathLabel}.length left=${left.length} right=${right.length}`;
    }
    for (let index = 0; index < left.length; index += 1) {
      const nested = firstJsonDifference(left[index], right[index], `${pathLabel}[${index}]`);
      if (nested) return nested;
    }
    return `${pathLabel} differs`;
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    for (const key of keys) {
      if (!(key in left)) return `${pathLabel}.${key} missing-left right=${describeValue(right[key])}`;
      if (!(key in right)) return `${pathLabel}.${key} missing-right left=${describeValue(left[key])}`;
      const nested = firstJsonDifference(left[key], right[key], `${pathLabel}.${key}`);
      if (nested) return nested;
    }
    return `${pathLabel} differs`;
  }
  return `${pathLabel} left=${describeValue(left)} right=${describeValue(right)}`;
}

export function describeFirstStoreDumpDifference(left: LsimStoreDump, right: LsimStoreDump): string {
  if (left.digest === right.digest && stableStringify(left.databases) === stableStringify(right.databases)) {
    return 'none';
  }
  const rowCountDiff = firstJsonDifference(left.rowCounts, right.rowCounts, '$.rowCounts');
  const databaseDiff = firstJsonDifference(left.databases, right.databases, '$.databases');
  return [
    `leftDigest=${left.digest}`,
    `rightDigest=${right.digest}`,
    `rowCountDiff=${rowCountDiff ?? 'none'}`,
    `databaseDiff=${databaseDiff ?? 'none'}`,
  ].join('; ');
}
