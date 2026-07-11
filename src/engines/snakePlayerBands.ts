import { type Band, BANDS } from './leagueConstruction';

/**
 * THE CANONICAL PLAYER→BAND-WEIGHTS ADAPTER (captain-authored, S3 Amendment 1).
 *
 * Every fit computation (rational room, desk cards, worth-to-you payloads) derives a
 * player's band weights through THIS function — never hand-built at a call site.
 *
 * Judgment calls, documented:
 * - Ratings are the SMB4 0-99 scale; weights are rating/99 clamped to [0,1], so an
 *   elite (99) rating contributes full weight in its band and a 50 contributes ~half.
 *   `bandFitMultiplier` consumes these as a lift-weighted average centered on 1, so
 *   the ABSOLUTE level matters less than the between-band shape; a linear map keeps
 *   the shape honest without inventing curvature.
 * - Role masking: a player's value lives where he can be rostered. Position players
 *   carry the four hitter bands only; pitchers carry Rotation and/or Bullpen per role
 *   (a swing SP/RP carries both — mirroring how the luxury-cap tables count him in
 *   both groups, leagueConstruction.ts MOD_STAT_TO_LUX).
 */
export interface SnakePlayerBandInput {
  isPitcher: boolean;
  /** Pitcher role when isPitcher (SP | SP/RP | RP | CP). Ignored for hitters. */
  role?: string | null;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
}

const RATING_CAP = 99;

function ratingWeight(rating: number): number {
  if (!Number.isFinite(rating)) return 0;
  return Math.min(1, Math.max(0, rating / RATING_CAP));
}

export function derivePlayerBandWeights(input: SnakePlayerBandInput): Record<Band, number> {
  const weights = Object.fromEntries(BANDS.map((band) => [band, 0])) as Record<Band, number>;
  if (input.isPitcher) {
    const armScore = ratingWeight((input.velocity + input.junk + input.accuracy) / 3);
    const role = (input.role ?? '').toUpperCase();
    const startable = role === 'SP' || role === 'SP/RP';
    const relievable = role === 'RP' || role === 'CP' || role === 'SP/RP';
    if (startable) weights.Rotation = armScore;
    if (relievable) weights.Bullpen = armScore;
    // Unknown role: value could live in either pen — carry both rather than neither,
    // so the fit read degrades toward neutral instead of silently zeroing the player.
    if (!startable && !relievable) {
      weights.Rotation = armScore;
      weights.Bullpen = armScore;
    }
    return weights;
  }
  weights.Power = ratingWeight(input.power);
  weights.Contact = ratingWeight(input.contact);
  weights.Speed = ratingWeight(input.speed);
  weights.Defense = ratingWeight((input.fielding + input.arm) / 2);
  return weights;
}
