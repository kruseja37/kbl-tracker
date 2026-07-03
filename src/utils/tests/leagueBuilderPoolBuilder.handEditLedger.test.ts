import { describe, expect, it } from 'vitest';

import { foldHandEditLedger } from '../leagueBuilderPoolBuilder';

describe('foldHandEditLedger', () => {
  const universeIds = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('returns empty ledgers on first extraction', () => {
    expect(foldHandEditLedger({
      currentMemberIds: ['legacy-pool-leftover'],
      universeIds,
    })).toEqual({ handAdds: [], handRemoves: [] });
  });

  it('captures since-last adds and removes', () => {
    expect(foldHandEditLedger({
      previousAdds: [],
      previousRemoves: [],
      lastExtractedIds: ['a', 'b', 'c'],
      currentMemberIds: ['b', 'c', 'd'],
      universeIds,
    })).toEqual({ handAdds: ['d'], handRemoves: ['a'] });
  });

  it('cancels add-then-remove and remove-then-readd deltas', () => {
    expect(foldHandEditLedger({
      previousAdds: ['d'],
      lastExtractedIds: ['a', 'b', 'c', 'd'],
      currentMemberIds: ['a', 'b', 'c'],
      universeIds,
    })).toEqual({ handAdds: [], handRemoves: ['d'] });

    expect(foldHandEditLedger({
      previousAdds: [],
      previousRemoves: ['a'],
      lastExtractedIds: ['b', 'c'],
      currentMemberIds: ['a', 'b', 'c'],
      universeIds,
    })).toEqual({ handAdds: ['a'], handRemoves: [] });
  });

  it('drops deleted ids and keeps ledgers disjoint', () => {
    expect(foldHandEditLedger({
      previousAdds: ['d', 'missing', 'e'],
      previousRemoves: ['d', 'missing', 'f'],
      lastExtractedIds: ['a', 'b'],
      currentMemberIds: ['b', 'c'],
      universeIds,
    })).toEqual({ handAdds: ['c', 'd', 'e'], handRemoves: ['a', 'f'] });
  });
});
