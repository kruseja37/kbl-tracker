import {
  getInstanceGames,
  getPlayerEliminationAllTimeStats,
  getPlayerInstanceStats,
  getExhibitionGames,
  getExhibitionLeagueId,
  resolvePlayerIdsForInstance,
  resolveExhibitionPlayerIds,
  type AlmanacInstanceMode,
  type BattingLine,
  type PitchingLine,
} from '../../../utils/almanacQueries';
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
  playerIds: string[];
  teamNames: Map<string, string>;
}

export async function getExhibitionPlayerContext(
  playerId: string,
  leagueId: string,
): Promise<ExhibitionPlayerContext> {
  const games = await getExhibitionGames();
  const playerIds = await resolveExhibitionPlayerIds(playerId, leagueId);
  const playerIdSet = new Set(playerIds);
  const teamNames = new Map<string, string>();

  const appearanceGames = games.filter((game) => {
    const gameLeagueId = getExhibitionLeagueId(game);

    if (gameLeagueId !== leagueId) {
      return false;
    }

    teamNames.set(game.awayTeamId, game.awayTeamName);
    teamNames.set(game.homeTeamId, game.homeTeamName);

    return Boolean(playerIds.find((candidateId) => game.playerStats[candidateId])) || game.pitcherGameStats.some(
      (pitcher) => playerIdSet.has(pitcher.pitcherId),
    );
  });

  const latestGame = appearanceGames[0] ?? null;
  const snapshotSource = appearanceGames.find((game) =>
    playerIds.some((candidateId) => Boolean(game.playerRatingsSnapshots?.[candidateId])),
  ) ?? null;
  const latestSnapshot =
    playerIds
      .map((candidateId) => snapshotSource?.playerRatingsSnapshots?.[candidateId] ?? null)
      .find((snapshot): snapshot is PlayerRatingsSnapshot => snapshot !== null) ?? null;

  return {
    games: appearanceGames,
    latestGame,
    latestSnapshot,
    playerIds,
    teamNames,
  };
}

export interface PlayerInstanceContext extends ExhibitionPlayerContext {
  mode: AlmanacInstanceMode;
}

export async function getPlayerInstanceContext(
  playerId: string,
  mode: AlmanacInstanceMode,
  instanceId: string,
): Promise<PlayerInstanceContext> {
  if (mode === 'exhibition') {
    const context = await getExhibitionPlayerContext(playerId, instanceId);
    return {
      ...context,
      mode,
    };
  }

  const games = await getInstanceGames(mode, instanceId);
  const playerIds = await resolvePlayerIdsForInstance(playerId, mode, instanceId);
  const playerIdSet = new Set(playerIds);
  const teamNames = new Map<string, string>();

  const appearanceGames = games.filter((game) => {
    teamNames.set(game.awayTeamId, game.awayTeamName);
    teamNames.set(game.homeTeamId, game.homeTeamName);

    return Boolean(playerIds.find((candidateId) => game.playerStats[candidateId])) ||
      game.pitcherGameStats.some((pitcher) => playerIdSet.has(pitcher.pitcherId));
  });

  const latestGame = appearanceGames[0] ?? null;
  const snapshotSource = appearanceGames.find((game) =>
    playerIds.some((candidateId) => Boolean(game.playerRatingsSnapshots?.[candidateId])),
  ) ?? null;
  const latestSnapshot =
    playerIds
      .map((candidateId) => snapshotSource?.playerRatingsSnapshots?.[candidateId] ?? null)
      .find((snapshot): snapshot is PlayerRatingsSnapshot => snapshot !== null) ?? null;

  return {
    mode,
    games: appearanceGames,
    latestGame,
    latestSnapshot,
    playerIds,
    teamNames,
  };
}

export async function getPlayerDisplayStats(
  playerId: string,
  mode: AlmanacInstanceMode,
  instanceId: string,
): Promise<{
  instanceBatting: BattingLine | null;
  instancePitching: PitchingLine | null;
  allTimeEliminationBatting: BattingLine | null;
  allTimeEliminationPitching: PitchingLine | null;
}> {
  const instanceStats = await getPlayerInstanceStats(playerId, mode, instanceId);
  if (mode !== 'elimination') {
    return {
      instanceBatting: instanceStats.batting,
      instancePitching: instanceStats.pitching,
      allTimeEliminationBatting: null,
      allTimeEliminationPitching: null,
    };
  }

  const allTimeStats = await getPlayerEliminationAllTimeStats(playerId);
  return {
    instanceBatting: instanceStats.batting,
    instancePitching: instanceStats.pitching,
    allTimeEliminationBatting: allTimeStats.batting,
    allTimeEliminationPitching: allTimeStats.pitching,
  };
}
