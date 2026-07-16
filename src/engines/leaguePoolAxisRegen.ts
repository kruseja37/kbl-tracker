import { HISTORICAL_LEGENDS_SOURCE_DATABASE } from '../data/historicalLegendsAppData';
import type { Personality, Player } from '../utils/leagueBuilderStorage';
import {
  generateHiddenPersonalityModifiers,
  PERSONALITY_WEIGHTS,
  pickWeighted,
} from '../utils/prospectScoutingDraftEngine';

// Personality weights are the canonical seven visible personality words.
const PERSONALITY_WEIGHT_ENTRIES = PERSONALITY_WEIGHTS as Array<[Personality, number]>;

function stablePlayerIdentity(player: Player): string {
  if (player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE) {
    return player.sourceId
      ?? player.historicalSourceId
      ?? player.historicalLegend?.playerId
      ?? player.id;
  }
  return `${player.sourceDatabase ?? (player.isCustom ? 'CUSTOM' : 'UNSOURCED')}:${player.id}`;
}

/**
 * Initialize draft personality truth without making it league-global mutable state.
 *
 * - Legends keep their authored visible personality and any curated hidden values.
 *   Missing hidden values receive a stable person-level fallback shared by all card versions.
 * - Custom players keep the visible personality the user selected and receive hidden values once.
 * - Generated FARM prospects already own both axes and pass through byte-identically.
 * - Other imported/non-Legends players receive a stable randomized visible personality and hidden
 *   values only when hidden values are absent. Once present, a later lock is a no-op.
 * - Chemistry is source-authored and is never rewritten here.
 *
 * `leagueId` remains in the signature for the lock adapter, but is deliberately excluded from the
 * seed. The same global player may appear in more than one draft without one league changing the
 * personality truth observed by another.
 */
export function initializeDraftPoolPlayerAxes(players: Player[], leagueId: string): Player[] {
  void leagueId;
  return players.map((player) => {
    const stableIdentity = stablePlayerIdentity(player);
    const isLegend = player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE;

    if (player.hiddenPersonalityModifiers) {
      return { ...player };
    }

    const seed = isLegend
      ? `historical-legend:${stableIdentity}`
      : `draft-player:${stableIdentity}`;

    return {
      ...player,
      personality: isLegend || player.isCustom
        ? player.personality
        : pickWeighted(`${seed}:personality`, PERSONALITY_WEIGHT_ENTRIES),
      hiddenPersonalityModifiers: generateHiddenPersonalityModifiers(seed),
    };
  });
}
