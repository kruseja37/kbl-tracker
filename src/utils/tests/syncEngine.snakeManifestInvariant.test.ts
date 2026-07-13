import { describe, expect, test } from 'vitest';

import type { SnakeDraftManifest } from '../leagueBuilderStorage';
import { snakeManifestIdentity } from '../snakeDraftManifest';
import {
  assertSnakeDraftSessionInboundInvariant,
  assertSnakeManifestPoolInboundInvariant,
  assertSnakeRosterHandoffInboundInvariant,
} from '../syncEngine';

const pool = { leagueId: 'league', players: [{ id: 'p1', iv: 100 }] };
const manifest: SnakeDraftManifest = {
  formatVersion: 'snake-draft-manifest-v1',
  phase: 'MLB',
  leagueId: 'league',
  seasonNumber: 1,
  frozenAt: '2026-07-12T12:00:00.000Z',
  source: { sessionId: 'league::startup-mlb-draft::1', revision: 3 },
  versions: { workflow: 'snake-v1', engine: 'snake-s6' },
  seed: 'seed',
  tier: 'standard',
  balanceMode: 'taxed',
  rounds: 1,
  lockedClubs: [{ teamId: 'team-1', gmName: 'GM', hotseat: true, archetypeId: 'mlb-power' }],
  pickOrder: [{ round: 1, pick: 1, teamId: 'team-1' }],
  completedPicks: [{
    round: 1,
    pick: 1,
    teamId: 'team-1',
    playerId: 'p1',
    settledSalary: 100,
    marginalTax: 0,
    launchSalary: 100,
    salarySource: 'pick',
  }],
  versionState: null,
  pool: {
    identity: 'snake-pool-v1:5e8c2b87:1',
    playerIds: ['p1'],
    mlbIvByPlayerId: { p1: 100 },
  },
};
const marker = {
  formatVersion: 'snake-roster-handoff-v1' as const,
  phase: 'MLB' as const,
  sourceSessionId: manifest.source.sessionId,
  manifestPoolIdentity: manifest.pool.identity,
  manifestIdentity: snakeManifestIdentity(manifest),
  committedAt: '2026-07-12T12:01:00.000Z',
};
const session = { leagueId: 'league', draftManifest: manifest };
const handedOffSession = { ...session, rosterHandoff: marker };
const exactReceipt = {
  formatVersion: 'snake-draft-reset-v1',
  leagueId: 'league',
  phase: 'MLB',
  sourceSessionId: manifest.source.sessionId,
  manifestPoolIdentity: manifest.pool.identity,
  manifestIdentity: marker.manifestIdentity,
  rosterHandoffCommittedAt: marker.committedAt,
  resetAt: '2026-07-12T12:02:00.000Z',
};

describe('snake manifest inbound sync preflight', () => {
  test('accepts an exact manifest and RegisteredPool pair', () => {
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool,
      currentSession: session,
      proposedPool: pool,
      proposedSession: session,
    })).not.toThrow();
  });

  test('rejects pool mutation, manifest removal, and mismatched paired inbound writes', () => {
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool,
      currentSession: session,
      proposedPool: { ...pool, players: [{ id: 'p1', iv: 99 }] },
      proposedSession: session,
    })).toThrow('cannot mutate');
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: pool,
      currentSession: session,
      proposedPool: pool,
      proposedSession: { leagueId: 'league' },
    })).toThrow('cannot remove or replace');
    expect(() => assertSnakeManifestPoolInboundInvariant({
      currentPool: null,
      currentSession: null,
      proposedPool: pool,
      proposedSession: {
        leagueId: 'league',
        draftManifest: { ...manifest, pool: { ...manifest.pool, playerIds: ['p2'], mlbIvByPlayerId: { p2: 100 } } },
      },
    })).toThrow('do not match exactly');
  });

  test('accepts only a marker that is bound to the entire manifest', () => {
    expect(() => assertSnakeRosterHandoffInboundInvariant({
      currentSession: session,
      proposedSession: handedOffSession,
    })).not.toThrow();
    expect(() => assertSnakeRosterHandoffInboundInvariant({
      currentSession: session,
      proposedSession: { ...handedOffSession, rosterHandoff: { ...marker, manifestIdentity: 'forged' } },
    })).toThrow('does not match its manifest');
    expect(() => assertSnakeRosterHandoffInboundInvariant({
      currentSession: handedOffSession,
      proposedSession: session,
    })).toThrow('cannot remove or replace');
  });

  test('requires the exact one-run receipt to delete a frozen handed-off session', () => {
    expect(() => assertSnakeDraftSessionInboundInvariant({
      currentSession: handedOffSession,
      proposedSession: null,
      sessionDeleted: true,
      tombstoneData: exactReceipt,
    })).not.toThrow();

    for (const tombstoneData of [
      {},
      { ...exactReceipt, manifestIdentity: 'forged' },
      { ...exactReceipt, rosterHandoffCommittedAt: null },
      { ...exactReceipt, sourceSessionId: 'different-run' },
    ]) {
      expect(() => assertSnakeDraftSessionInboundInvariant({
        currentSession: handedOffSession,
        proposedSession: null,
        sessionDeleted: true,
        tombstoneData,
      })).toThrow('exact Run It Back receipt');
    }
  });

  test('rejects replaying a pre-handoff receipt after the roster marker exists', () => {
    expect(() => assertSnakeDraftSessionInboundInvariant({
      currentSession: handedOffSession,
      proposedSession: null,
      sessionDeleted: true,
      tombstoneData: { ...exactReceipt, rosterHandoffCommittedAt: null },
    })).toThrow('exact Run It Back receipt');
  });

  test('protects a frozen farm prospect snapshot before its manifest is complete', () => {
    const farmSession = {
      leagueId: 'league',
      farmProspectSnapshot: [{ id: 'prospect-1', name: 'One' }],
    };
    expect(() => assertSnakeDraftSessionInboundInvariant({
      currentSession: farmSession,
      proposedSession: { ...farmSession, farmProspectSnapshot: [{ id: 'prospect-1', name: 'Changed' }] },
    })).toThrow('frozen farm prospect snapshot');
  });
});
