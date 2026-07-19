import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearSnakeLiveCompanionResume,
  getOrCreateSnakeLiveDeviceId,
  getOrCreateSnakeLiveDeviceCredentials,
  getOrCreateSnakeLiveHostCredentials,
  readSnakeLiveCompanionResume,
  saveSnakeLiveCompanionResume,
} from '../snakeLiveCapabilityStore';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('kbl-snake-live-capabilities');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The test database is blocked.'));
  });
}

describe('Snake live capability store', () => {
  beforeEach(deleteDatabase);

  it('moves a legacy device id into IndexedDB', async () => {
    await expect(getOrCreateSnakeLiveDeviceId('legacy-device')).resolves.toBe('legacy-device');
    await expect(getOrCreateSnakeLiveDeviceId('different-device')).resolves.toBe('legacy-device');
  });

  it('keeps a stable host token without using localStorage', async () => {
    const first = await getOrCreateSnakeLiveHostCredentials('session', 'host');
    const second = await getOrCreateSnakeLiveHostCredentials('session', 'host');
    expect(second).toEqual(first);
    expect(first.hostToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps the active room resume record bound to one account', async () => {
    const resume = { roomId: 'room-a', roomCode: '2468', deviceId: 'device-a', gmName: 'Poke Foster' };
    await saveSnakeLiveCompanionResume('owner-a', resume);
    await expect(readSnakeLiveCompanionResume('owner-a')).resolves.toEqual(resume);
    await expect(readSnakeLiveCompanionResume('owner-b')).resolves.toBeNull();
  });

  it('clears only the matching room resume and keeps the device key for rejoin', async () => {
    const resume = { roomId: 'room-a', roomCode: '2468', deviceId: 'device-a', gmName: 'Poke Foster' };
    await saveSnakeLiveCompanionResume('owner-a', resume);
    const first = await getOrCreateSnakeLiveDeviceCredentials(resume.roomId, resume.deviceId);
    await clearSnakeLiveCompanionResume('owner-a', 'another-room', resume.deviceId);
    await expect(readSnakeLiveCompanionResume('owner-a')).resolves.toEqual(resume);
    await clearSnakeLiveCompanionResume('owner-a', resume.roomId, resume.deviceId);
    await expect(readSnakeLiveCompanionResume('owner-a')).resolves.toBeNull();
    await expect(getOrCreateSnakeLiveDeviceCredentials(resume.roomId, resume.deviceId)).resolves.toEqual(first);
  });
});
