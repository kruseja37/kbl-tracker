import type { LuxuryCapRow } from '../data/tierParams';
import type { ConstructionPlayer } from './leagueConstruction';

/** Snake tax is roster-local; room size never changes a team's rating thresholds. */
export function snakeLuxuryCaps(baseCaps: LuxuryCapRow[]): LuxuryCapRow[] {
  return baseCaps;
}

function playerRating(player: ConstructionPlayer, stat: LuxuryCapRow['stat']): number {
  if (stat === 'VEL' || stat === 'JNK' || stat === 'ACC') return player.pit?.[stat] ?? 0;
  return player.bat[stat];
}

function pressureForGroup(
  player: ConstructionPlayer,
  caps: readonly LuxuryCapRow[],
  group: LuxuryCapRow['group'],
): number {
  return caps
    .filter((row) => row.group === group && row.topN > 0)
    .reduce((sum, row) => {
      const perSeatCap = Math.max(row.cap, 0) / row.topN;
      const over = playerRating(player, row.stat) - perSeatCap;
      if (over <= 0) return sum;
      return sum + row.penaltyPer100 * (over / 100) ** row.penaltyCurve + row.minAdder;
    }, 0);
}

/**
 * A roster-independent screening price for one player against every tax row that can
 * apply to that player. Exact roster settlement still belongs to `luxuryTax`; this
 * proxy only keeps fit labels and legal-finish search from ignoring unshifted rows.
 */
export function snakePlayerTaxPressure(
  player: ConstructionPlayer,
  caps: readonly LuxuryCapRow[],
): number {
  if (!player.isPitcher) return pressureForGroup(player, caps, 'hitters');
  if (player.role === 'SP') return pressureForGroup(player, caps, 'rotation');
  if (player.role === 'RP' || player.role === 'CP') return pressureForGroup(player, caps, 'bullpen');
  if (player.role === 'SP/RP') {
    // A swing arm settles in exactly one group, but the roster-independent pool label does not
    // yet know which group that will be. Screen against the more expensive applicable row so a
    // rotation-bound arm cannot hide behind a friendly bullpen cap (or vice versa).
    return Math.max(
      pressureForGroup(player, caps, 'rotation'),
      pressureForGroup(player, caps, 'bullpen'),
    );
  }
  return 0;
}
