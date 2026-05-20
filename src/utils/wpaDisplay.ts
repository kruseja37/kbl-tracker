export function formatWpaPoints(decimalWpa: number | null | undefined, digits = 1): string {
  if (typeof decimalWpa !== 'number' || !Number.isFinite(decimalWpa)) {
    return 'n/a';
  }

  const points = decimalWpa * 100;
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toFixed(digits)} pp`;
}
