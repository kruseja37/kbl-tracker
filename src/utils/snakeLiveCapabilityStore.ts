import { createSnakeLiveCapabilityToken } from './snakeLiveRoomTransport';

const DATABASE_NAME = 'kbl-snake-live-capabilities';
const DATABASE_VERSION = 1;
const STORE_NAME = 'capabilities';

interface StoredCapability {
  id: string;
  token?: string;
  value?: unknown;
  updatedAt: string;
}

export interface SnakeLiveHostCredentials {
  hostDeviceId: string;
  hostToken: string;
}

export interface SnakeLiveDeviceCredentials {
  deviceId: string;
  deviceToken: string;
}

export interface SnakeLiveCompanionResume {
  roomId: string;
  roomCode: string;
  deviceId: string;
  gmName: string;
}

function companionResumeId(ownerUserId: string): string {
  return `resume:${ownerUserId}`;
}

function isCompanionResume(value: unknown): value is SnakeLiveCompanionResume {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.roomId === 'string'
    && row.roomId.length > 0
    && typeof row.roomCode === 'string'
    && /^\d{4}$/.test(row.roomCode)
    && typeof row.deviceId === 'string'
    && row.deviceId.length > 0
    && typeof row.gmName === 'string'
    && row.gmName.trim().length > 0;
}

export async function getOrCreateSnakeLiveDeviceId(legacyId?: string | null): Promise<string> {
  const stored = await read('device-identity');
  if (stored?.token) return stored.token;
  const deviceId = legacyId?.trim() || globalThis.crypto.randomUUID();
  await write({ id: 'device-identity', token: deviceId, updatedAt: new Date().toISOString() });
  return deviceId;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('THE LIVE ROOM KEY STORE DID NOT OPEN.'));
  });
}

async function read(id: string): Promise<StoredCapability | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve((request.result as StoredCapability | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('THE LIVE ROOM KEY COULD NOT BE READ.'));
    });
  } finally {
    db.close();
  }
}

async function write(record: StoredCapability): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('THE LIVE ROOM KEY COULD NOT BE SAVED.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('THE LIVE ROOM KEY SAVE STOPPED.'));
    });
  } finally {
    db.close();
  }
}

async function getOrCreate(id: string): Promise<string> {
  const stored = await read(id);
  if (stored?.token) return stored.token;
  const token = createSnakeLiveCapabilityToken();
  await write({ id, token, updatedAt: new Date().toISOString() });
  return token;
}

export async function saveSnakeLiveCompanionResume(
  ownerUserId: string,
  resume: SnakeLiveCompanionResume,
): Promise<void> {
  if (!ownerUserId.trim() || !isCompanionResume(resume)) {
    throw new Error('THE LIVE ROOM RESUME DATA IS INVALID.');
  }
  await write({
    id: companionResumeId(ownerUserId),
    value: { ...resume, gmName: resume.gmName.trim() },
    updatedAt: new Date().toISOString(),
  });
}

export async function readSnakeLiveCompanionResume(
  ownerUserId: string,
): Promise<SnakeLiveCompanionResume | null> {
  if (!ownerUserId.trim()) return null;
  const stored = await read(companionResumeId(ownerUserId));
  return isCompanionResume(stored?.value) ? stored.value : null;
}

export async function clearSnakeLiveCompanionResume(
  ownerUserId: string,
  roomId?: string,
  deviceId?: string,
): Promise<void> {
  if (!ownerUserId.trim()) return;
  const stored = await read(companionResumeId(ownerUserId));
  const resume = isCompanionResume(stored?.value) ? stored.value : null;
  if (roomId && resume?.roomId !== roomId) return;
  if (deviceId && resume?.deviceId !== deviceId) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(companionResumeId(ownerUserId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('THE LIVE ROOM RESUME DATA COULD NOT BE CLEARED.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('THE LIVE ROOM RESUME CLEAR STOPPED.'));
    });
  } finally {
    db.close();
  }
}

export async function getOrCreateSnakeLiveHostCredentials(
  sessionId: string,
  hostDeviceId: string,
): Promise<SnakeLiveHostCredentials> {
  return {
    hostDeviceId,
    hostToken: await getOrCreate(`host:${sessionId}:${hostDeviceId}`),
  };
}

export async function getOrCreateSnakeLiveDeviceCredentials(
  roomId: string,
  deviceId: string,
): Promise<SnakeLiveDeviceCredentials> {
  return {
    deviceId,
    deviceToken: await getOrCreate(`device:${roomId}:${deviceId}`),
  };
}
