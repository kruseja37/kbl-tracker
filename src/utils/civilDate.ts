/**
 * Project a moment onto the device-local civil calendar.
 *
 * This deliberately avoids toISOString(), whose UTC projection can report the
 * next civil day for an evening game played in a US timezone.
 */
export function getDeviceLocalCivilDate(value: Date | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot derive a civil date from an invalid timestamp');
  }

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
