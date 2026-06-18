/**
 * §13 tooth #2 / LS-19 — Flashpoint-decay accumulator (pure engine).
 *
 * A "turned-on" player who STAYS on the roster (a locked Albatross, a
 * trade-demander) bleeds fan morale slowly every game — "not a cliff, a
 * compounding tax" (§13). This module is the PURE decay primitive: given a
 * player's running unresolved-game count and the kind of flashpoint, it
 * returns the per-game fan-morale tax for THIS game.
 *
 * The tax COMPOUNDS with the number of consecutive games the flashpoint is
 * left unresolved (ignoring it is not free, and it gets worse the longer you
 * sit on it) but is CLAMPED to a per-game cap so it stays a tax, never a cliff.
 *
 * PURE: no Math.random / Date.now / IO / store / reporter. Every magnitude
 * lives in FLASHPOINT_DECAY_TUNING (shape-locked; values owned by the §16
 * Simulation Gate). The store + per-game compute that consume this engine live
 * in src/utils/franchiseFlashpointDecay*.ts.
 */

/** The reason a player is "turned on" (the seam input — null = not turned on). */
export type FlashpointKind = 'albatross' | 'trade_demander' | null;

export interface FlashpointDecayTuning {
  /** Base per-game fan-morale tax for a turned-on player's FIRST unresolved game (<= 0). */
  baseGameTax: number;
  /** Compounding ramp: each additional consecutive unresolved game adds this fraction of the base. */
  compoundPerGame: number;
  /** Hard per-game floor — the tax can never exceed this magnitude ("a tax, not a cliff"). */
  maxGameTax: number;
  /** Rounding precision for the returned tax. */
  precision: number;
}

// SIM-TUNE: placeholder magnitudes owned by the §16 Simulation Gate (DEFAULTS-TAKEN
// under AUTH-4 — §13 fixes the SHAPE, not the numbers). albatross and trade_demander
// share a base in v1; split later if the sim shows they should differ.
export const FLASHPOINT_DECAY_TUNING: FlashpointDecayTuning = {
  baseGameTax: -0.5,
  compoundPerGame: 0.1,
  maxGameTax: -3.0,
  precision: 1000,
};

export interface FlashpointGameTaxInput {
  /** The kind of flashpoint this game (null = not turned on → no tax). */
  kind: FlashpointKind;
  /**
   * How many consecutive games this flashpoint has been unresolved INCLUDING
   * the current one (1 = first unresolved game). Values < 1 are treated as 0
   * games unresolved → no tax.
   */
  consecutiveGamesUnresolved: number;
}

export interface FlashpointGameTaxResult {
  /** The per-game fan-morale tax for this game (<= 0). 0 when not turned on. */
  gameTax: number;
  /** True when a turned-on flashpoint produced a non-zero tax this game. */
  applied: boolean;
  /** True when the compounding tax hit the per-game clamp (maxGameTax). */
  clamped: boolean;
}

function roundTo(value: number, precision: number): number {
  return Math.round(value * precision) / precision;
}

/**
 * Compute the per-game fan-morale tax for a player who STAYED turned-on this game.
 *
 * Sign-correct (always <= 0), compounding with consecutiveGamesUnresolved, and
 * clamped to FLASHPOINT_DECAY_TUNING.maxGameTax so it never becomes a cliff.
 */
export function computeFlashpointGameTax(
  input: FlashpointGameTaxInput,
  tuning: FlashpointDecayTuning = FLASHPOINT_DECAY_TUNING,
): FlashpointGameTaxResult {
  const games = Math.floor(input.consecutiveGamesUnresolved);

  // Not turned on, or no unresolved games yet → no tax, accumulator does not grow.
  if (input.kind === null || games < 1) {
    return { gameTax: 0, applied: false, clamped: false };
  }

  // Compounding ramp: the tax grows by compoundPerGame of the base for each
  // additional consecutive unresolved game (game 1 = base, game N = base × (1 + (N-1)×ramp)).
  const rampFactor = 1 + (games - 1) * tuning.compoundPerGame;
  const rawTax = tuning.baseGameTax * rampFactor;

  // Clamp to the per-game floor ("a tax, not a cliff"). Both values are <= 0,
  // so the clamp is a max() toward zero.
  const clamped = rawTax < tuning.maxGameTax;
  const cappedTax = clamped ? tuning.maxGameTax : rawTax;

  return {
    gameTax: roundTo(cappedTax, tuning.precision),
    applied: true,
    clamped,
  };
}
