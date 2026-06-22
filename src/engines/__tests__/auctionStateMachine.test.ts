import { describe, expect, test } from 'vitest';

import {
  nextBidTurn,
  seededNominationOrder,
} from '../auctionStateMachine';

describe('auctionStateMachine pure helpers', () => {
  test('nextBidTurn wraps cyclically through nomination order', () => {
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'C', 'C')).toBe('A');
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'A', 'A')).toBe('C');
    expect(nextBidTurn(['A', 'B', 'C'], ['C'], 'A', 'C')).toBeNull();
    expect(nextBidTurn(['A', 'B', 'C'], ['B', 'C'], 'missing', null)).toBe('B');
  });

  test('seeded nomination order is deterministic and fixed after setup', () => {
    const first = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-1');
    const second = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-1');
    const differentSeed = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-2');

    expect(first).toEqual(second);
    expect(first).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(differentSeed).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(new Set(first).size).toBe(4);
  });
});
