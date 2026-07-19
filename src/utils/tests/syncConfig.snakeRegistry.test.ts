import { describe, expect, test } from 'vitest';

import {
  SYNC_REGISTRY,
  isRetiredGenericSyncStore,
  shouldUseGenericSyncStore,
} from '../syncConfig';

describe('snake draft sync registry', () => {
  test('keeps active snake room authority out of generic account backup', () => {
    expect(SYNC_REGISTRY['kbl-league-builder']).toMatchObject({
      leagueTemplates: 'id',
      globalTeams: 'id',
      globalPlayers: 'id',
      teamRosters: 'teamId',
      registeredPools: 'leagueId',
      scoutProfiles: 'id',
      startupDraftSessions: 'id',
    });
    expect(SYNC_REGISTRY['kbl-league-builder']).not.toHaveProperty('mlbDraftSessions');
    expect(SYNC_REGISTRY['kbl-league-builder']).not.toHaveProperty('snakeSeatBoards');
    expect(shouldUseGenericSyncStore('kbl-league-builder', 'mlbDraftSessions')).toBe(false);
    expect(shouldUseGenericSyncStore('kbl-league-builder', 'snakeSeatBoards')).toBe(false);
    expect(isRetiredGenericSyncStore('kbl-league-builder', 'mlbDraftSessions')).toBe(true);
    expect(isRetiredGenericSyncStore('kbl-league-builder', 'snakeSeatBoards')).toBe(true);
    expect(isRetiredGenericSyncStore('kbl-event-log', 'unknownEvents')).toBe(false);
  });
});
