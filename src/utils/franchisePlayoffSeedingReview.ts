import type { TeamStanding } from './seasonStorage';

export type FranchisePlayoffLeague = 'Eastern' | 'Western';
export type FranchisePlayoffTiebreakerPolicy = 'record-then-run-differential';

export interface FranchisePlayoffTeamSnapshot {
  id?: string;
  teamId?: string;
  name?: string;
  league?: string;
  conference?: string;
  conferenceName?: string;
  conferenceId?: string;
}

export interface FranchisePlayoffSeedingReviewTeam {
  teamId: string;
  teamName: string;
  seed: number | null;
  league: FranchisePlayoffLeague;
  wins: number;
  losses: number;
  runDiff: number;
  winPct: number;
  qualifying: boolean;
  eliminated: boolean;
  tiebreakerNote: string;
}

export interface FranchisePlayoffTieGroup {
  wins: number;
  losses: number;
  teamIds: string[];
  resolvedByRunDifferential: boolean;
  unresolved: boolean;
}

export interface FranchisePlayoffSeedingReview {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamsQualifying: number;
  tiebreakerPolicy: FranchisePlayoffTiebreakerPolicy;
  teams: FranchisePlayoffSeedingReviewTeam[];
  qualifiedTeams: FranchisePlayoffSeedingReviewTeam[];
  eliminatedTeams: FranchisePlayoffSeedingReviewTeam[];
  tieGroups: FranchisePlayoffTieGroup[];
  blockers: string[];
  generatedAt: number;
}

export interface BuildFranchisePlayoffSeedingReviewInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  standings: TeamStanding[];
  franchiseTeams: FranchisePlayoffTeamSnapshot[];
  teamsQualifying: number;
  generatedAt?: number;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getSnapshotTeamId(team: FranchisePlayoffTeamSnapshot): string | null {
  return hasText(team.id) ? team.id : hasText(team.teamId) ? team.teamId : null;
}

function winPct(standing: Pick<TeamStanding, 'wins' | 'losses'>): number {
  const games = standing.wins + standing.losses;
  return games > 0 ? standing.wins / games : 0;
}

function compareStandingsForPlayoffSeeding(left: TeamStanding, right: TeamStanding): number {
  const winPctDelta = winPct(right) - winPct(left);
  if (Math.abs(winPctDelta) > 0.000001) return winPctDelta;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  if (right.runDiff !== left.runDiff) return right.runDiff - left.runDiff;
  return left.teamId.localeCompare(right.teamId);
}

function resolveLeague(
  team: FranchisePlayoffTeamSnapshot,
  seedIndex: number,
  teamsQualifying: number,
): FranchisePlayoffLeague {
  const rawLeague = [
    team.league,
    team.conference,
    team.conferenceName,
    team.conferenceId,
  ].find(hasText);

  if (rawLeague) {
    const normalized = rawLeague.toLowerCase();
    if (normalized.includes('west')) return 'Western';
    if (normalized.includes('east')) return 'Eastern';
  }

  return seedIndex < Math.ceil(teamsQualifying / 2) ? 'Eastern' : 'Western';
}

function buildTieGroups(
  rankedStandings: TeamStanding[],
  teamsQualifying: number,
): FranchisePlayoffTieGroup[] {
  const byRecord = new Map<string, TeamStanding[]>();

  for (const standing of rankedStandings) {
    const key = `${standing.wins}-${standing.losses}`;
    const group = byRecord.get(key) ?? [];
    group.push(standing);
    byRecord.set(key, group);
  }

  return [...byRecord.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const runDiffs = new Set(group.map((standing) => standing.runDiff));
      const indexesByRunDiff = new Map<number, number[]>();

      for (const standing of group) {
        const index = rankedStandings.findIndex((ranked) => ranked.teamId === standing.teamId);
        const indexes = indexesByRunDiff.get(standing.runDiff) ?? [];
        indexes.push(index);
        indexesByRunDiff.set(standing.runDiff, indexes);
      }

      const unresolved = [...indexesByRunDiff.values()].some((indexes) =>
        indexes.length > 1 && indexes.some((index) => index >= 0 && index < teamsQualifying),
      );

      return {
        wins: group[0].wins,
        losses: group[0].losses,
        teamIds: group.map((standing) => standing.teamId),
        resolvedByRunDifferential: runDiffs.size > 1,
        unresolved,
      };
    });
}

export function buildFranchisePlayoffSeedingReview(
  input: BuildFranchisePlayoffSeedingReviewInput,
): FranchisePlayoffSeedingReview {
  const blockers: string[] = [];
  const statsScopeId = input.statsScopeId ?? input.seasonId;

  if (!hasText(input.franchiseId)) blockers.push('Missing franchiseId for playoff seeding review.');
  if (!hasText(input.seasonId)) blockers.push('Missing seasonId for playoff seeding review.');
  if (!hasText(statsScopeId)) blockers.push('Missing statsScopeId for playoff seeding review.');
  if (!Number.isInteger(input.seasonNumber) || input.seasonNumber <= 0) {
    blockers.push('Missing positive seasonNumber for playoff seeding review.');
  }
  if (!Number.isInteger(input.teamsQualifying) || input.teamsQualifying <= 0) {
    blockers.push('Playoff seeding review requires a positive teamsQualifying value.');
  }

  const franchiseTeamById = new Map<string, FranchisePlayoffTeamSnapshot>();
  for (const team of input.franchiseTeams) {
    const teamId = getSnapshotTeamId(team);
    if (teamId) franchiseTeamById.set(teamId, team);
  }

  if (franchiseTeamById.size === 0) {
    blockers.push('Cannot review playoff seeding without franchise-owned team snapshots.');
  }
  if (input.standings.length < input.teamsQualifying) {
    blockers.push(`Cannot review playoff seeding: ${input.standings.length} standings rows for ${input.teamsQualifying} qualifying teams.`);
  }

  const rankedStandings = [...input.standings].sort(compareStandingsForPlayoffSeeding);
  const missingTeamIds = rankedStandings
    .slice(0, Math.max(0, input.teamsQualifying))
    .map((standing) => standing.teamId)
    .filter((teamId) => !franchiseTeamById.has(teamId));
  if (missingTeamIds.length > 0) {
    blockers.push(`Cannot review playoff seeding; missing franchise-owned team snapshots for ${missingTeamIds.join(', ')}.`);
  }

  const tieGroups = buildTieGroups(rankedStandings, input.teamsQualifying);
  const unresolved = tieGroups.filter((group) => group.unresolved);
  if (unresolved.length > 0) {
    blockers.push(`Manual playoff seeding resolution required: ${unresolved.map((group) => group.teamIds.join('/')).join(', ')} remain tied after record and run differential.`);
  }

  const teams = rankedStandings.map((standing, index) => {
    const snapshot = franchiseTeamById.get(standing.teamId);
    const qualifying = index < input.teamsQualifying;
    const group = tieGroups.find((candidate) => candidate.teamIds.includes(standing.teamId));
    const tiebreakerNote = group?.resolvedByRunDifferential
      ? `Tied ${standing.wins}-${standing.losses}; run differential ${standing.runDiff >= 0 ? '+' : ''}${standing.runDiff} resolves order.`
      : 'Ordered by regular-season record.';

    return {
      teamId: standing.teamId,
      teamName: snapshot?.name || standing.teamName || standing.teamId,
      seed: qualifying ? index + 1 : null,
      league: resolveLeague(snapshot ?? { id: standing.teamId }, index, input.teamsQualifying),
      wins: standing.wins,
      losses: standing.losses,
      runDiff: standing.runDiff,
      winPct: winPct(standing),
      qualifying,
      eliminated: !qualifying,
      tiebreakerNote,
    };
  });

  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId,
    seasonNumber: input.seasonNumber,
    teamsQualifying: input.teamsQualifying,
    tiebreakerPolicy: 'record-then-run-differential',
    teams,
    qualifiedTeams: teams.filter((team) => team.qualifying),
    eliminatedTeams: teams.filter((team) => team.eliminated),
    tieGroups,
    blockers,
    generatedAt: input.generatedAt ?? Date.now(),
  };
}

export function reviewMatchesPlayoffScope(
  review: FranchisePlayoffSeedingReview,
  scope: {
    franchiseId: string;
    seasonId: string;
    statsScopeId?: string;
    seasonNumber: number;
    teamsQualifying: number;
  },
): boolean {
  return review.franchiseId === scope.franchiseId &&
    review.seasonId === scope.seasonId &&
    review.statsScopeId === (scope.statsScopeId ?? scope.seasonId) &&
    review.seasonNumber === scope.seasonNumber &&
    review.teamsQualifying === scope.teamsQualifying &&
    review.blockers.length === 0 &&
    review.qualifiedTeams.length === scope.teamsQualifying;
}
