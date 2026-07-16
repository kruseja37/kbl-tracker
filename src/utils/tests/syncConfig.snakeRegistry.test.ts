import { describe, expect, test } from 'vitest';

import { SYNC_REGISTRY } from '../syncConfig';

describe('snake draft sync registry', () => {
  test('syncs every league-builder authority store needed by the MLB-to-FARM room', () => {
    expect(SYNC_REGISTRY['kbl-league-builder']).toMatchObject({
      leagueTemplates: 'id',
      globalTeams: 'id',
      globalPlayers: 'id',
      teamRosters: 'teamId',
      registeredPools: 'leagueId',
      mlbDraftSessions: 'id',
      scoutProfiles: 'id',
      startupDraftSessions: 'id',
    });
  });
});
