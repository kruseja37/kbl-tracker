import { describe, expect, test } from 'vitest';

import {
  buildFallbackRuntimePlayerId,
  buildScopedRuntimePlayerId,
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

  test('can side-scope stored playerIds for elimination runtime isolation', () => {
    expect(buildScopedRuntimePlayerId('shared-player-1', 'away')).toBe('away:shared-player-1');
    expect(buildScopedRuntimePlayerId('shared-player-1', 'home')).toBe('home:shared-player-1');
    expect(
      getRuntimeRosterEntityId(
        { name: 'Shared Player', playerId: 'shared-player-1' },
        'away',
        { scopeStoredPlayerIds: true },
      )
    ).toBe('away:shared-player-1');
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
