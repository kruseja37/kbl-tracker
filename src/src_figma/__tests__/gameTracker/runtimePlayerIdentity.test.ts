import { describe, expect, test } from 'vitest';

import {
  buildFallbackRuntimePlayerId,
  getRuntimeRosterEntityId,
} from '../../app/utils/runtimePlayerIdentity';

describe('runtime player identity helpers', () => {
  test('prefers stable roster playerId when available', () => {
    expect(
      getRuntimeRosterEntityId(
        { name: 'J. MARTINEZ', playerId: 'lb-player-42' },
        'away'
      )
    ).toBe('lb-player-42');
  });

  test('falls back to legacy side-based runtime ids for legacy rosters', () => {
    expect(buildFallbackRuntimePlayerId('J. Martinez', 'home')).toBe('home-j.-martinez');
    expect(
      getRuntimeRosterEntityId(
        { name: 'J. Martinez' },
        'home'
      )
    ).toBe('home-j.-martinez');
  });
});
