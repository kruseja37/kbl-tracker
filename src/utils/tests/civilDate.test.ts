import { describe, expect, test } from 'vitest';
import { getDeviceLocalCivilDate } from '../civilDate';

describe('device-local civil date', () => {
  test('projects local calendar fields without a UTC conversion', () => {
    const localEvening = new Date(2026, 6, 11, 23, 45, 0, 0);
    expect(getDeviceLocalCivilDate(localEvening)).toBe('2026-07-11');
  });

  test('rejects invalid timestamps instead of persisting a malformed date', () => {
    expect(() => getDeviceLocalCivilDate(new Date(Number.NaN))).toThrow(
      'Cannot derive a civil date from an invalid timestamp',
    );
  });
});
