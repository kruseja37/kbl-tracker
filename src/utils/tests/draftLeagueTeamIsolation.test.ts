import { describe, expect, test } from 'vitest';

import {
  DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE,
  assertDraftLeagueTeamIdsAreExclusive,
  draftLeagueTeamSharingConflicts,
} from '../draftLeagueTeamIsolation';

describe('draft league team isolation', () => {
  test('reports every team id shared with another league', () => {
    const leagues = [
      { id: 'draft', teamIds: ['copy-a', 'source-b'] },
      { id: 'source', teamIds: ['source-a', 'source-b'] },
      { id: 'other', teamIds: ['source-b'] },
    ];

    expect(draftLeagueTeamSharingConflicts(leagues, 'draft')).toEqual([
      { teamId: 'source-b', otherLeagueIds: ['other', 'source'] },
    ]);
    expect(() => assertDraftLeagueTeamIdsAreExclusive(leagues, 'draft')).toThrow(
      DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE,
    );
  });

  test('accepts copied team ids even when the source clubs belong to another league', () => {
    const leagues = [
      { id: 'draft-a', teamIds: ['copy-a-1', 'copy-b-1'] },
      { id: 'draft-b', teamIds: ['copy-a-2', 'copy-b-2'] },
      { id: 'source', teamIds: ['source-a', 'source-b'] },
    ];

    expect(draftLeagueTeamSharingConflicts(leagues, 'draft-a')).toEqual([]);
    expect(() => assertDraftLeagueTeamIdsAreExclusive(leagues, 'draft-a')).not.toThrow();
    expect(() => assertDraftLeagueTeamIdsAreExclusive(leagues, 'draft-b')).not.toThrow();
  });
});
