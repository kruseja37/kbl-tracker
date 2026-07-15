import { describe, expect, it } from 'vitest';

import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { snakeLuxuryCaps } from '../snakeLuxuryTax';

describe('snake roster-local luxury tax', () => {
  it('preserves the configured table exactly because room size is not a tax input', () => {
    expect(snakeLuxuryCaps(LUXURY_CAP_TABLES.standard)).toBe(LUXURY_CAP_TABLES.standard);
  });
});
