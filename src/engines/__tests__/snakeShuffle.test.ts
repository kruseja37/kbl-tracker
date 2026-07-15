import { describe, expect, test } from 'vitest';

import { seededSnakeShuffle } from '../snakeShuffle';

describe('seeded snake order', () => {
  test('is deterministic, complete, and does not mutate its source order', () => {
    const source = ['a', 'b', 'c', 'd'];
    const first = seededSnakeShuffle(source, 'opening-day');
    expect(first).toEqual(seededSnakeShuffle(source, 'opening-day'));
    expect([...first].sort()).toEqual([...source].sort());
    expect(source).toEqual(['a', 'b', 'c', 'd']);
  });
});
