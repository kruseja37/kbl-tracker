/**
 * §9 / L9b-1 — the PURE trait-from-reality SCORER (the peer-relative "strength
 * score", TS-2).
 *
 * This is the FIRST of the three L9b pieces:
 *   - L9b-1 (this file): given a player's reality signal and a peer pool,
 *     produce a `realityPercentile` in [0, 1] — gated by role-eligibility
 *     (VI.2) and the min-sample valve (VI.1). PURE, no IndexedDB, no mutation.
 *   - L9b-2 (acquisition): P(gain/lose) = realityPercentile × personalityTilt ×
 *     morale, with hysteresis / no-offsetting-pair / 2-trait cap.
 *   - L9b-3 (grant/write-back): the dark hook + context reconstructor + the
 *     §11 trait-confirm write-back of trait1/trait2.
 *
 * Spec: spec-docs/TRAIT_SIGNAL_CERTIFICATION.md §VI (TS-1..13), DECISIONS_LOG
 * 2026-06-16. The acquisition combiner is SPEC-FIXED multiplicative; all
 * magnitudes are §16 Simulation-Gate placeholders.
 *
 * The percentile math is CONSUMED from the shared `percentile.ts` primitive
 * (lifted from salaryCalculator) — one truth, never re-implemented. Counting
 * signals are scaled by season/innings length via `scaledThreshold` BEFORE the
 * sufficiency check, mirroring `franchiseAwardTrust.ts`, so the valve and the
 * percentile auto-adapt to short SMB4 seasons.
 *
 * SMB4-ASSET NOTE: the 75 canonical trait names are FROZEN data
 * (`TRAIT_PRICING` in src/data/traitPricing.ts, 1:1 with the interaction
 * matrix). This engine CONSUMES them and the VI.2 role classification — it
 * never invents traits, never edits the matrix, never re-derives pricing.
 *
 * Build-DARK: no production caller yet (L9b-2 and the L9b-3 dark hook wire it).
 */

import { getPercentile } from './percentile';
import {
  type AdaptiveStandardsConfig,
  DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  type AdaptiveThresholdBasis,
  scaledThreshold,
} from '../utils/franchiseAdaptiveStandards';
import { TRAIT_PRICING } from '../data/traitPricing';

// ============================================================================
// §16 SIM-TUNE placeholders — shape locked, numbers owned by the Simulation Gate.
// ============================================================================

export interface TraitRealityScorerTuning {
  /**
   * Floor on the player's own counting sample (already season-scaled) before a
   * signal is allowed to score. Thin sample → dormant, never flickers on noise.
   * Rate signals ('none' basis) use `minSampleRate` instead.
   */
  minSampleSeason: number;
  /** Floor for combined-basis (innings) signals after scaling. */
  minSampleCombined: number;
  /** Floor for 'none'-basis rate signals (e.g. a minimum # of opportunities). */
  minSampleRate: number;
  /** Minimum peer-pool size for the percentile to be trustworthy. */
  minPeerPool: number;
}

export const TRAIT_REALITY_SCORER_TUNING: TraitRealityScorerTuning = {
  // Placeholder counting floor at the MLB-162 baseline; scaledThreshold shrinks
  // it for short SMB4 seasons (e.g. 128 games / 6 innings).
  minSampleSeason: 50,
  minSampleCombined: 20,
  minSampleRate: 10,
  minPeerPool: 3,
};

// ============================================================================
// Role eligibility (VI.2) — CRYSTAL lists from TRAIT_SIGNAL_CERTIFICATION.md.
// FROZEN SMB4-asset classification; consumed, never re-derived.
// ============================================================================

export type TraitRole = 'pitcher' | 'position' | 'universal' | 'cut';

/** Eligibility of the player being scored. */
export type PlayerRole = 'pitcher' | 'position';

// NAME-DRIFT RECONCILIATION (canonical TRAIT_PRICING names, NOT the spec
// shorthand): the VI.2 list writes 'K Neglecter' but the frozen data is
// 'K Neglector'; 'Two Way' is the data triplet 'Two Way (C)/(IF)/(OF)' (the
// random fielding-position grant is baked into the name). A misspelled trait
// silently never fires, so the SET must match the data exactly.
//
// DEFAULT-TAKEN (AUTH-4, spec silent): 'Workhorse' is in the matrix/pricing
// (75th trait, A7 — a staminaModifier pitcher trait) but is NOT enumerated in
// any VI.2 role list. A position player has no stamina/pitch-count signal, so
// it is classified PITCHER here. Flagged in the run log for JK.
const PITCHER_ONLY_TRAITS: readonly string[] = [
  'Gets Ahead', 'Falls Behind', 'Composed', 'BB Prone', 'K Collector',
  'K Neglector', 'Rally Stopper', 'Surrounded', 'Meltdown', 'Specialist',
  'Reverse Splits', 'Pick Officer', 'Easy Jumps', 'Wild Thing', 'Metal Head',
  'Crossed Up', 'Workhorse',
  'Two Way (C)', 'Two Way (IF)', 'Two Way (OF)',
  'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK', 'Elite SL', 'Elite CB',
  'Elite CH', 'Elite SB',
];

const POSITION_ONLY_TRAITS: readonly string[] = [
  // Batting (25)
  'First Pitch Slayer', 'First Pitch Prayer', 'Tough Out', 'Whiffer',
  'Big Hack', 'Little Hack', 'Bad Ball Hitter', 'Easy Target', 'RBI Hero',
  'RBI Zero', 'Rally Starter',
  'CON vs LHP', 'CON vs RHP', 'POW vs LHP', 'POW vs RHP',
  'Ace Exterminator', 'Bunter', 'Fastball Hitter', 'Off-Speed Hitter',
  'Low Pitch', 'High Pitch', 'Inside Pitch', 'Outside Pitch',
  'Mind Gamer', 'Pinch Perfect',
  // Baserunning (7)
  'Stealer', 'Bad Jumps', 'Sprinter', 'Slow Poke', 'Base Rounder',
  'Base Jogger', 'Distractor',
  // Fielding (7)
  'Cannon Arm', 'Noodle Arm', 'Magic Hands', 'Butter Fingers', 'Dive Wizard',
  'Utility', 'Wild Thrower',
];

const UNIVERSAL_TRAITS: readonly string[] = [
  'Clutch', 'Choker', 'Durable', 'Injury Prone', 'Consistent', 'Volatile',
  'Stimulated',
];

const CUT_TRAITS: readonly string[] = ['Sign Stealer'];

const PITCHER_ONLY_SET = new Set(PITCHER_ONLY_TRAITS);
const POSITION_ONLY_SET = new Set(POSITION_ONLY_TRAITS);
const UNIVERSAL_SET = new Set(UNIVERSAL_TRAITS);
const CUT_SET = new Set(CUT_TRAITS);

/** The frozen set of canonical trait names (1:1 with the interaction matrix). */
export const CANONICAL_TRAIT_NAMES: ReadonlySet<string> = new Set(
  TRAIT_PRICING.map((entry) => entry.name),
);

/**
 * The VI.2 role of a trait. `null` ⇒ the name is not a canonical trait (a data
 * defect a caller should surface, NOT silently coerce — a misspelled trait
 * never fires).
 */
export function traitRole(traitName: string): TraitRole | null {
  if (!CANONICAL_TRAIT_NAMES.has(traitName)) return null;
  if (CUT_SET.has(traitName)) return 'cut';
  if (PITCHER_ONLY_SET.has(traitName)) return 'pitcher';
  if (POSITION_ONLY_SET.has(traitName)) return 'position';
  if (UNIVERSAL_SET.has(traitName)) return 'universal';
  // A canonical-but-unclassified trait is a spec gap, not a silent universal.
  return null;
}

/**
 * Is this player ELIGIBLE to earn/lose this trait (VI.2)? Cut traits are never
 * eligible; universal traits are open to both roles; otherwise the player's
 * role must match the trait's role. A non-canonical name is never eligible.
 *
 * Two Way is pitcher-only; a two-way player holds ONLY pitcher traits — there is
 * NO gateway into the position-player trait pool (JK 2026-06-18). On grant a
 * random IF/OF/C fielding position is assigned (defensive roster only); that is
 * not a scoring gate, so it is intentionally not modeled here.
 */
export function isTraitEligibleForRole(
  traitName: string,
  playerRole: PlayerRole,
): boolean {
  const role = traitRole(traitName);
  if (role === null || role === 'cut') return false;
  if (role === 'universal') return true;
  return role === playerRole;
}

// ============================================================================
// The strength score (TS-2).
// ============================================================================

export type SignalSufficiency =
  | 'sufficient'
  | 'thin_sample'
  | 'thin_peer_pool'
  | 'ineligible_role'
  | 'unknown_trait';

export interface TraitRealityScoreInput {
  /** Canonical trait name (must be in CANONICAL_TRAIT_NAMES). */
  traitName: string;
  /** Role of the player being scored. */
  playerRole: PlayerRole;
  /** The player's own reality signal value for this trait (higher = stronger). */
  signalValue: number;
  /**
   * The player's counting sample backing the signal (PA / games for 'season',
   * IP for 'combined', opportunities for 'none'). The valve gates on this.
   */
  sampleSize: number;
  /**
   * The peer pool of comparable signal values, INCLUDING or excluding the
   * player — the percentile is rank-within-pool either way; callers should be
   * consistent. Need NOT be pre-sorted (this engine sorts a copy).
   */
  peerValues: readonly number[];
  /**
   * How the counting threshold scales with season/inning length: 'season' for
   * PA/games, 'combined' for IP, 'none' for rate signals.
   */
  basis: AdaptiveThresholdBasis;
}

export interface TraitRealityScore {
  traitName: string;
  /** The peer-relative strength score in [0, 1]; null when not scorable. */
  realityPercentile: number | null;
  /** Whether the signal cleared eligibility + sample + peer-pool gates. */
  sufficient: boolean;
  sufficiency: SignalSufficiency;
  /** The season-scaled minimum sample this signal had to clear. */
  scaledMinSample: number;
  /** The size of the peer pool used. */
  peerPoolSize: number;
}

/**
 * Compute the peer-relative reality percentile (TS-2 "strength score") for one
 * trait signal, gated by VI.2 role-eligibility and the VI.1 min-sample valve.
 *
 * Order of gates (a single failure short-circuits to a null percentile):
 *   1. unknown trait name (data defect) → no score
 *   2. role-ineligible → no score
 *   3. thin counting sample (after season scaling) → dormant, no score
 *   4. thin peer pool → no trustworthy percentile
 *   5. otherwise → percentile = rank of signalValue within the sorted peers
 */
export function computeTraitRealityScore(
  input: TraitRealityScoreInput,
  config: AdaptiveStandardsConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  tuning: TraitRealityScorerTuning = TRAIT_REALITY_SCORER_TUNING,
): TraitRealityScore {
  const baseFloor =
    input.basis === 'none'
      ? tuning.minSampleRate
      : input.basis === 'combined'
        ? tuning.minSampleCombined
        : tuning.minSampleSeason;
  // 'none' (rate) floors do not scale with season length; counting floors do.
  const scaledMinSample =
    input.basis === 'none' ? baseFloor : scaledThreshold(baseFloor, config, input.basis);

  const peerPoolSize = input.peerValues.length;

  const fail = (sufficiency: SignalSufficiency): TraitRealityScore => ({
    traitName: input.traitName,
    realityPercentile: null,
    sufficient: false,
    sufficiency,
    scaledMinSample,
    peerPoolSize,
  });

  if (traitRole(input.traitName) === null) return fail('unknown_trait');
  if (!isTraitEligibleForRole(input.traitName, input.playerRole)) {
    return fail('ineligible_role');
  }
  if (!Number.isFinite(input.sampleSize) || input.sampleSize < scaledMinSample) {
    return fail('thin_sample');
  }
  if (peerPoolSize < tuning.minPeerPool) return fail('thin_peer_pool');

  const sorted = [...input.peerValues].sort((a, b) => a - b);
  const realityPercentile = getPercentile(input.signalValue, sorted);

  return {
    traitName: input.traitName,
    realityPercentile,
    sufficient: true,
    sufficiency: 'sufficient',
    scaledMinSample,
    peerPoolSize,
  };
}
