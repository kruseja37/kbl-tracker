import { teamRosterNeed, playerFillsHardRequirement } from '../rosterNeed';
import type { AuctionSimConfig, AuctionSimPlayer, AuctionSimTeamState } from './types';
import { seededUnit } from './types';

function positionClass(player: AuctionSimPlayer): string {
  if (!player.pos) return 'any';
  if (player.pos.isPitcher) return player.pos.role ?? 'P';
  return player.pos.position;
}

export function scarcityPressure(
  player: AuctionSimPlayer,
  teams: readonly AuctionSimTeamState[],
  remainingPlayers: readonly AuctionSimPlayer[],
): number {
  const key = positionClass(player);
  const supply = remainingPlayers.filter((candidate) => positionClass(candidate) === key).length + 1;
  const demand = teams.reduce((sum, team) => sum + Math.max(0, 22 - team.roster.length), 0);
  const classDemand = key === 'any' ? demand : Math.max(1, Math.ceil(demand / 10));
  return Math.max(0, Math.log((classDemand + 1) / (supply + 1)));
}

export function rosterNeedMultiplier(team: AuctionSimTeamState, player: AuctionSimPlayer): number {
  if (!player.pos) return 1;
  const positions = team.roster.reduce<Record<string, NonNullable<AuctionSimTeamState['roster'][number]['pos']>>>(
    (acc, entry) => {
      if (entry.pos !== undefined) acc[entry.playerId] = entry.pos;
      return acc;
    },
    {},
  );
  if (Object.keys(positions).length !== team.roster.length) return 1;
  const need = teamRosterNeed(team.roster.map((entry) => entry.playerId), positions);
  if (need === null) return 1;
  if (playerFillsHardRequirement(player.pos, need)) return 1.28;
  return 1;
}

export function rawWillingnessToPay(
  team: AuctionSimTeamState,
  player: AuctionSimPlayer,
  remainingPlayers: readonly AuctionSimPlayer[],
  teams: readonly AuctionSimTeamState[],
  reserve: number,
  config: AuctionSimConfig,
): number {
  const need = rosterNeedMultiplier(team, player);
  const scarcity = scarcityPressure(player, teams, remainingPlayers);
  const noise = seededUnit(config.seed, `${team.teamId}:${player.playerId}`) - 0.5;

  if (config.biddingPolicy === 'naive') {
    return Math.max(reserve, player.iv * (1.08 + noise * 0.08));
  }

  const openSlotPressure = Math.max(0.75, 1 + (config.rosterSize - team.roster.length) / config.rosterSize * 0.12);
  return Math.max(
    reserve,
    player.iv * need * openSlotPressure + reserve * 0.25 + player.iv * scarcity * 0.18 + player.iv * noise * 0.06,
  );
}
