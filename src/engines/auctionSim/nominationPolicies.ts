import { rosterNeedMultiplier, scarcityPressure } from './valuation';
import type { AuctionSimConfig, AuctionSimPlayer, AuctionSimTeamState } from './types';
import { seededUnit } from './types';

function byScoreDescIdAsc(
  left: { player: AuctionSimPlayer; score: number },
  right: { player: AuctionSimPlayer; score: number },
): number {
  return right.score - left.score || left.player.playerId.localeCompare(right.player.playerId);
}

export function selectAuctionSimNominee(
  remainingPlayers: readonly AuctionSimPlayer[],
  teams: readonly AuctionSimTeamState[],
  nominationNumber: number,
  config: AuctionSimConfig,
): AuctionSimPlayer | null {
  if (remainingPlayers.length === 0) return null;

  if (config.nominationPolicy === 'randomSeeded') {
    return [...remainingPlayers].sort(
      (left, right) =>
        seededUnit(config.seed, `${nominationNumber}:${left.playerId}`) -
          seededUnit(config.seed, `${nominationNumber}:${right.playerId}`) ||
        left.playerId.localeCompare(right.playerId),
    )[0];
  }

  if (config.nominationPolicy === 'needFirst') {
    const activeTeam = [...teams]
      .filter((team) => team.roster.length < config.rosterSize)
      .sort((left, right) => left.roster.length - right.roster.length || left.teamId.localeCompare(right.teamId))[0];
    if (activeTeam) {
      return remainingPlayers
        .map((player) => ({ player, score: player.iv * rosterNeedMultiplier(activeTeam, player) }))
        .sort(byScoreDescIdAsc)[0].player;
    }
  }

  if (config.nominationPolicy === 'marketPressure') {
    return remainingPlayers
      .map((player) => ({ player, score: player.iv * (1 + scarcityPressure(player, teams, remainingPlayers, config.rosterSize)) }))
      .sort(byScoreDescIdAsc)[0].player;
  }

  return [...remainingPlayers].sort((left, right) => right.iv - left.iv || left.playerId.localeCompare(right.playerId))[0];
}
