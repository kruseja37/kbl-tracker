import { getAllCompletedGames, type CompletedGameRecord } from './gameStorage';
import { getEliminationTeam } from './eliminationPlayerStorage';
import { getTeam, type Team } from './leagueBuilderStorage';

export type AlmanacTeamIdentitySource =
  | 'elimination-team'
  | 'completed-game'
  | 'live-team';

export interface AlmanacTeamIdentity {
  id: string;
  name: string;
  abbreviation?: string;
  location?: string;
  nickname?: string;
  colors?: Team['colors'];
  logoUrl?: string;
  stadium?: string;
  source: AlmanacTeamIdentitySource;
}

function trimOrUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getTeamDisplayName(team: Team): string {
  const location = trimOrUndefined(team.location);
  const nickname = trimOrUndefined(team.nickname);
  const locationNickname = [location, nickname].filter(Boolean).join(' ');

  return trimOrUndefined(locationNickname) ?? trimOrUndefined(team.name) ?? team.id;
}

function identityFromTeam(
  team: Team,
  source: Exclude<AlmanacTeamIdentitySource, 'completed-game'>,
): AlmanacTeamIdentity {
  return {
    id: team.id,
    name: getTeamDisplayName(team),
    abbreviation: trimOrUndefined(team.abbreviation),
    location: trimOrUndefined(team.location),
    nickname: trimOrUndefined(team.nickname),
    colors: team.colors,
    logoUrl: trimOrUndefined(team.logoUrl),
    stadium: trimOrUndefined(team.stadium),
    source,
  };
}

function gameBelongsToEliminationRun(
  game: CompletedGameRecord,
  runId: string,
): boolean {
  return (
    (game.competitionType === 'elimination' || Boolean(game.isEliminationGame)) &&
    (game.competitionId === runId ||
      game.statsScopeId === `elimination-${runId}` ||
      game.seasonId === `elimination-${runId}`)
  );
}

function getArchivedGameTeamName(
  game: CompletedGameRecord,
  teamId: string,
): string | undefined {
  if (game.awayTeamId === teamId) {
    return trimOrUndefined(game.awayTeamName);
  }

  if (game.homeTeamId === teamId) {
    return trimOrUndefined(game.homeTeamName);
  }

  return undefined;
}

function identityFromCompletedGames(
  games: CompletedGameRecord[],
  runId: string,
  teamId: string,
): AlmanacTeamIdentity | null {
  const matchingGames = games
    .filter((game) => gameBelongsToEliminationRun(game, runId))
    .filter((game) => game.awayTeamId === teamId || game.homeTeamId === teamId)
    .sort((left, right) => left.date - right.date);

  if (matchingGames.length === 0) {
    return null;
  }

  const nameGame =
    matchingGames.find((game) => getArchivedGameTeamName(game, teamId)) ??
    matchingGames[0];
  const homeStadiumGame =
    matchingGames.find(
      (game) => game.homeTeamId === teamId && trimOrUndefined(game.stadiumName),
    ) ?? matchingGames.find((game) => trimOrUndefined(game.stadiumName));

  return {
    id: teamId,
    name: getArchivedGameTeamName(nameGame, teamId) ?? teamId,
    stadium: trimOrUndefined(homeStadiumGame?.stadiumName),
    source: 'completed-game',
  };
}

export async function resolveLiveTeamIdentity(
  teamId: string,
): Promise<AlmanacTeamIdentity | null> {
  const team = await getTeam(teamId);
  return team ? identityFromTeam(team, 'live-team') : null;
}

export async function resolveEliminationTeamIdentity(
  runId: string,
  teamId: string,
): Promise<AlmanacTeamIdentity | null> {
  const copiedTeam = await getEliminationTeam(runId, teamId).catch(() => null);
  if (copiedTeam) {
    return identityFromTeam(copiedTeam, 'elimination-team');
  }

  const completedGames = await getAllCompletedGames().catch(() => []);
  const completedGameIdentity = identityFromCompletedGames(
    completedGames,
    runId,
    teamId,
  );
  if (completedGameIdentity) {
    return completedGameIdentity;
  }

  return resolveLiveTeamIdentity(teamId);
}
