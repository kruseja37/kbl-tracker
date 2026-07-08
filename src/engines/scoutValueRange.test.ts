import { describe, expect, test } from 'vitest';

import { archetypeBandValueRange } from './scoutValueRange';

describe('archetypeBandValueRange', () => {
  test('keeps the true opening ask inside the displayed scout-value range and tight reads are narrower than wide reads', () => {
    const trueOpeningAsk = 42000;
    const tight = archetypeBandValueRange(trueOpeningAsk, 3, 'value-range-tight');
    const wide = archetypeBandValueRange(trueOpeningAsk, 7, 'value-range-wide');

    expect(tight.low).toBeLessThanOrEqual(trueOpeningAsk);
    expect(tight.high).toBeGreaterThanOrEqual(trueOpeningAsk);
    expect(wide.low).toBeLessThanOrEqual(trueOpeningAsk);
    expect(wide.high).toBeGreaterThanOrEqual(trueOpeningAsk);
    expect(tight.high - tight.low).toBeLessThan(wide.high - wide.low);
  });
});
