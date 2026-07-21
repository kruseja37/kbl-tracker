import type { LeagueTemplate } from './leagueBuilderStorage';

export const DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE =
  'THIS LEAGUE SHARES CLUB RECORDS WITH ANOTHER LEAGUE. CREATE A NEW DRAFT LEAGUE.';

export interface DraftLeagueTeamSharingConflict {
  teamId: string;
  otherLeagueIds: string[];
}

export function draftLeagueTeamSharingConflicts(
  leagues: readonly Pick<LeagueTemplate, 'id' | 'teamIds'>[],
  leagueId: string,
): DraftLeagueTeamSharingConflict[] {
  const target = leagues.find((league) => league.id === leagueId);
  if (!target) return [];

  const otherLeagueIdsByTeamId = new Map<string, string[]>();
  for (const league of leagues) {
    if (league.id === leagueId) continue;
    for (const teamId of new Set(league.teamIds)) {
      const current = otherLeagueIdsByTeamId.get(teamId) ?? [];
      current.push(league.id);
      otherLeagueIdsByTeamId.set(teamId, current);
    }
  }

  return [...new Set(target.teamIds)].flatMap((teamId) => {
    const otherLeagueIds = otherLeagueIdsByTeamId.get(teamId);
    return otherLeagueIds?.length
      ? [{ teamId, otherLeagueIds: [...otherLeagueIds].sort((left, right) => left.localeCompare(right)) }]
      : [];
  });
}

export function assertDraftLeagueTeamIdsAreExclusive(
  leagues: readonly Pick<LeagueTemplate, 'id' | 'teamIds'>[],
  leagueId: string,
): void {
  if (draftLeagueTeamSharingConflicts(leagues, leagueId).length > 0) {
    throw new Error(DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE);
  }
}
