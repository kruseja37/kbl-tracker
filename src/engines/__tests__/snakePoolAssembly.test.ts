import { describe, expect, test } from 'vitest';

import {
  assembleFullSourcePoolIds,
  authoritativeDraftPoolLockBlocked,
  draftPoolPreferenceScopeKey,
  snakePoolCompetitionPresetFromMultiplier,
  snakePoolSizeGuide,
  updateSnakePoolManualOverrides,
} from '../snakePoolAssembly';

describe('snake pool assembly', () => {
  test('publishes the exact eight-team competition guide', () => {
    expect(snakePoolSizeGuide(8)).toEqual({
      rosterDemand: 176,
      targets: { tight: 212, competitive: 238, loose: 264 },
    });
    expect(snakePoolCompetitionPresetFromMultiplier(1.2)).toBe('tight');
    expect(snakePoolCompetitionPresetFromMultiplier(1.35)).toBe('competitive');
    expect(snakePoolCompetitionPresetFromMultiplier(1.5)).toBe('loose');
    expect(snakePoolCompetitionPresetFromMultiplier(1.4)).toBe('competitive');
  });

  test('uses only the roster-local proof as the Snake lock gate', () => {
    expect(authoritativeDraftPoolLockBlocked({
      draftFormat: 'snake',
      legacySalaryOnlyBlocked: true,
      snakeRosterLocalProofBlocked: false,
    })).toBe(false);
    expect(authoritativeDraftPoolLockBlocked({
      draftFormat: 'snake',
      legacySalaryOnlyBlocked: false,
      snakeRosterLocalProofBlocked: true,
    })).toBe(true);
    expect(authoritativeDraftPoolLockBlocked({
      draftFormat: 'auction',
      legacySalaryOnlyBlocked: true,
      snakeRosterLocalProofBlocked: false,
    })).toBe(true);
  });

  test('isolates persisted pool preferences by draft format', () => {
    expect(draftPoolPreferenceScopeKey('league-a', 'auction', 'pool-first')).toBe('league-a:auction:pool-first');
    expect(draftPoolPreferenceScopeKey('league-a', 'snake', 'pool-first')).toBe('league-a:snake:pool-first');
    expect(draftPoolPreferenceScopeKey('league-a', 'auction', 'pool-first'))
      .not.toBe(draftPoolPreferenceScopeKey('league-a', 'snake', 'pool-first'));
  });

  test('loads the exact source union with hand edits and pins taking explicit precedence', () => {
    expect(assembleFullSourcePoolIds({
      sourceIds: ['a', 'b', 'c'],
      handAdds: ['outside'],
      handRemoves: ['b', 'c'],
      hardKeepIds: ['c'],
      validPlayerIds: ['a', 'b', 'c', 'outside'],
    })).toEqual(['a', 'c', 'outside']);
  });

  test('turns manual membership moves into durable source-relative intent', () => {
    expect(updateSnakePoolManualOverrides({
      sourceIds: ['a', 'b', 'c'],
      handAdds: [],
      handRemoves: [],
      addedIds: ['a', 'outside'],
      removedIds: ['b'],
    })).toEqual({ handAdds: ['a', 'outside'], handRemoves: ['b'] });

    expect(updateSnakePoolManualOverrides({
      sourceIds: ['a', 'b', 'c'],
      handAdds: ['a', 'outside'],
      handRemoves: ['b'],
      addedIds: ['b'],
      removedIds: ['outside'],
    })).toEqual({ handAdds: ['a', 'b'], handRemoves: ['outside'] });

    expect(assembleFullSourcePoolIds({
      sourceIds: ['a', 'b', 'outside'],
      handAdds: ['a', 'b'],
      handRemoves: ['outside'],
    })).toEqual(['a', 'b']);
  });
});
