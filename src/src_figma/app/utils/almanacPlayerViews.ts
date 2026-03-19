import { getExhibitionGames } from '../../../utils/almanacQueries';
import type { CompletedGameRecord, PlayerRatingsSnapshot } from '../../../utils/gameStorage';
import type { Player } from '../../../utils/leagueBuilderStorage';

export const PITCHER_POSITIONS = new Set(['SP', 'SP/RP', 'SP-RP', 'RP', 'CP']);

export function isPitcherPosition(primaryPosition?: string | null): boolean {
  return primaryPosition ? PITCHER_POSITIONS.has(primaryPosition) : false;
}

export function formatHometown(
  hometown?: { city: string; state: string } | null,
): string {
  if (!hometown?.city || !hometown?.state) {
    return 'Unknown';
  }

  return `${hometown.city}, ${hometown.state}`;
}

export function formatBattingAverage(value: number): string {
  const fixed = value.toFixed(3);
  return fixed.startsWith('0') ? fixed.slice(1) : fixed;
}

export function formatEarnedRunAverage(value: number): string {
  return value.toFixed(2);
}

export function formatSalary(value?: number | null): string {
  if (typeof value !== 'number') {
    return '--';
  }

  return `$${value.toLocaleString()}`;
}

export function formatTimelineDate(value: number | string): string {
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildPlayerName(player?: Pick<Player, 'firstName' | 'lastName'> | null): string {
  if (!player) {
    return 'Unknown Player';
  }

  return `${player.firstName} ${player.lastName}`.trim();
}

export interface ExhibitionPlayerContext {
  games: CompletedGameRecord[];
  latestGame: CompletedGameRecord | null;
  latestSnapshot: PlayerRatingsSnapshot | null;
  teamNames: Map<string, string>;
}

export async function getExhibitionPlayerContext(
  playerId: string,
  leagueId: string,
): Promise<ExhibitionPlayerContext> {
  const games = await getExhibitionGames();
  const teamNames = new Map<string, string>();

  const appearanceGames = games.filter((game) => {
    const gameLeagueId = game.leagueId ?? (
      game.competitionType === 'exhibition' ? game.competitionId ?? null : null
    );

    if (gameLeagueId !== leagueId) {
      return false;
    }

    teamNames.set(game.awayTeamId, game.awayTeamName);
    teamNames.set(game.homeTeamId, game.homeTeamName);

    return Boolean(game.playerStats[playerId]) || game.pitcherGameStats.some(
      (pitcher) => pitcher.pitcherId === playerId,
    );
  });

  const latestGame = appearanceGames[0] ?? null;
  const snapshotSource = appearanceGames.find((game) => game.playerRatingsSnapshots?.[playerId]) ?? null;

  return {
    games: appearanceGames,
    latestGame,
    latestSnapshot: snapshotSource?.playerRatingsSnapshots?.[playerId] ?? null,
    teamNames,
  };
}
