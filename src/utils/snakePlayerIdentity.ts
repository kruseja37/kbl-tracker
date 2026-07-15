import { deriveVersionGroupId } from '../engines/snakeVersioning';
import type { Player } from './leagueBuilderStorage';

function fullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`.trim().toLocaleLowerCase();
}

export function snakePlayerSourceId(player: Player): string | undefined {
  if (player.sourceId?.trim()) return player.sourceId.trim();
  const legacy = (player as Player & { historicalSourceId?: unknown }).historicalSourceId;
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim();
  return undefined;
}

export function snakePlayerVersionGroupId(player: Player): string {
  return deriveVersionGroupId({
    playerId: player.id,
    sourceId: snakePlayerSourceId(player),
    versionGroupId: player.versionGroupId,
  });
}

export function snakePlayerVersionLabel(player: Player, allPlayers: readonly Player[]): string | null {
  if (player.historicalProfileType) return player.historicalProfileType;
  if (player.versionLabel?.trim()) return player.versionLabel.trim();
  const sameGroup = allPlayers.filter((candidate) => snakePlayerVersionGroupId(candidate) === snakePlayerVersionGroupId(player));
  const sameName = allPlayers.filter((candidate) => fullName(candidate) === fullName(player));
  if (sameGroup.length <= 1 && sameName.length <= 1) return null;
  if (player.nickname?.trim() && sameName.filter((candidate) => candidate.nickname?.trim() === player.nickname?.trim()).length === 1) {
    return player.nickname.trim();
  }
  const base = `AGE ${player.age} · ${player.primaryPosition} · ${player.overallGrade}`;
  const peers = (sameGroup.length > 1 ? sameGroup : sameName)
    .filter((candidate) => `AGE ${candidate.age} · ${candidate.primaryPosition} · ${candidate.overallGrade}` === base)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (peers.length <= 1) return base;
  return `${base} · CARD ${peers.findIndex((candidate) => candidate.id === player.id) + 1}`;
}

export function buildSnakePlayerIdentityChips(player: Player, allPlayers: readonly Player[]): string[] {
  const label = snakePlayerVersionLabel(player, allPlayers);
  return label ? [label.toUpperCase()] : [];
}
