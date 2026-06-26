import type { PersistedGameState } from './gameStorage';
import { getRecentGames } from './gameStorage';
import { getFranchiseConfig } from './franchiseManager';
import { isFranchisePhase2StadiumRecordsEnabled } from './franchisePhase2Flags';
import {
  computeHomeParkRival,
  type HomeParkRivalCandidate,
} from './franchiseHomeParkRivalCompute';
import {
  getHomeParkRival,
  homeParkRivalId,
  homeParkRivalScopeKey,
  putHomeParkRival,
} from './franchiseHomeParkRivalStorage';
import { listFranchiseStadiumRecords } from './franchiseStadiumRecordsStorage';
import type { CompletedGameArchiveOptions, PersistedTrueValueScope } from './processCompletedGame';

export const homeParkRivalTapSeam = {
  getRecentGames,
  getFranchiseConfig,
  listFranchiseStadiumRecords,
  getHomeParkRival,
  putHomeParkRival,
};

export async function persistDarkHomeParkRivalForCompletedGame(
  gameState: PersistedGameState,
  scope: PersistedTrueValueScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<{ status: 'dark-noop' | 'updated' | 'unchanged'; rivalTeamId: string | null }> {
  if (!isFranchisePhase2StadiumRecordsEnabled()) {
    return { status: 'dark-noop', rivalTeamId: null };
  }

  const homeTeamId = gameState.homeTeamId;
  if (!homeTeamId) {
    return { status: 'dark-noop', rivalTeamId: null };
  }

  const config = await homeParkRivalTapSeam.getFranchiseConfig(scope.franchiseId);
  const stadiumId = config?.stadiums?.find((stadium) => stadium.teamId === homeTeamId)?.stadiumId;
  if (!stadiumId) {
    return { status: 'dark-noop', rivalTeamId: null };
  }

  const games = await homeParkRivalTapSeam.getRecentGames(2000, {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
  });
  const visitors = new Set<string>();
  const winsByOpponent = new Map<string, number>();

  for (const game of games) {
    if (game.stadiumId !== stadiumId || game.homeTeamId !== homeTeamId || !game.awayTeamId) continue;
    if (game.awayTeamId === homeTeamId) continue;
    visitors.add(game.awayTeamId);
    const awayScore = archiveOptions?.finalScore && game.gameId === gameState.gameId
      ? archiveOptions.finalScore.away
      : game.finalScore.away;
    const homeScore = archiveOptions?.finalScore && game.gameId === gameState.gameId
      ? archiveOptions.finalScore.home
      : game.finalScore.home;
    if (awayScore > homeScore) {
      winsByOpponent.set(game.awayTeamId, (winsByOpponent.get(game.awayTeamId) ?? 0) + 1);
    } else if (!winsByOpponent.has(game.awayTeamId)) {
      winsByOpponent.set(game.awayTeamId, 0);
    }
  }

  const records = await homeParkRivalTapSeam.listFranchiseStadiumRecords(scope);
  const candidates: HomeParkRivalCandidate[] = Array.from(visitors)
    .sort((left, right) => left.localeCompare(right))
    .map((teamId) => ({
      teamId,
      winsAtPark: winsByOpponent.get(teamId) ?? 0,
      recordsHeld: records.filter((record) =>
        record.stadiumId === stadiumId &&
        record.leaderPlayerIds.length > 0 &&
        record.leaderTeamIds.includes(teamId),
      ).length,
    }));

  const current = await homeParkRivalTapSeam.getHomeParkRival(scope, homeTeamId);
  const result = computeHomeParkRival({
    homeTeamId,
    candidates,
    distinctVisitorCount: visitors.size,
    currentRivalTeamId: current?.rivalTeamId ?? null,
  });

  if (result.rivalTeamId !== (current?.rivalTeamId ?? null) || !current) {
    await homeParkRivalTapSeam.putHomeParkRival({
      ...scope,
      id: homeParkRivalId(scope, homeTeamId),
      homeTeamId,
      rivalTeamId: result.rivalTeamId,
      rivalWinsAtPark: result.rivalWinsAtPark,
      rivalRecordsHeld: result.rivalRecordsHeld,
      scopeKey: homeParkRivalScopeKey(scope),
      updatedAt: new Date(gameState.savedAt ?? Date.now()).toISOString(),
      updatedAtGameId: gameState.gameId,
    });
    return { status: 'updated', rivalTeamId: result.rivalTeamId };
  }

  return { status: 'unchanged', rivalTeamId: result.rivalTeamId };
}
