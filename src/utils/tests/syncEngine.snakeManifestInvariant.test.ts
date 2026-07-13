import { describe, expect, test } from 'vitest';

import { assertSnakeManifestPoolInboundInvariant } from '../syncEngine';

const pool = { leagueId: 'league', players: [{ id: 'p1', iv: 100 }] };
const manifest = {
  formatVersion: 'snake-draft-manifest-v1', phase: 'MLB', leagueId: 'league',
  pool: { playerIds: ['p1'], mlbIvByPlayerId: { p1: 100 } },
};
const session = { leagueId: 'league', draftManifest: manifest };

describe('snake manifest inbound sync preflight', () => {
  test('accepts an exact manifest and RegisteredPool pair', () => {
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool, currentSession: session, proposedPool: pool, proposedSession: session,
    })).not.toThrow();
  });

  test('rejects pool mutation, manifest removal, and mismatched paired inbound writes', () => {
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool, currentSession: session,
      proposedPool: { ...pool, players: [{ id: 'p1', iv: 99 }] }, proposedSession: session,
    })).toThrow('cannot mutate');
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool, currentSession: session, proposedPool: pool, proposedSession: { leagueId: 'league' },
    })).toThrow('cannot remove or replace');
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: null, currentSession: null, proposedPool: pool,
      proposedSession: { leagueId: 'league', draftManifest: { ...manifest, pool: { playerIds: ['p2'], mlbIvByPlayerId: { p2: 100 } } } },
    })).toThrow('do not match exactly');
  });
});
