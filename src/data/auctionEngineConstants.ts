/**
 * Auction setup constants for the Mode-1 auction draft foundation.
 *
 * Source: AUCTION_DRAFT_SPEC.md §5.2 #1 and §6 rulings.
 * Keep this file data/types only; downstream auction engine, persistence, and
 * UI tickets consume these defaults without adding logic here.
 */

/**
 * §9.A: auction is the v1 primary and only format. Snake remains typed for the
 * v1.1 fallback path but is not a v1 setup default.
 */
export type AuctionFormat = 'auction' | 'snake';

export interface AuctionSetupConfig {
  format: AuctionFormat;
  bidIncrement: number;
  turnTimerSeconds: number | null;
  nominationOrderSeed: string;
  nominationWeightExponent?: number;
  flatReserveFloor?: number;
  cpuShillCount: number;
  excludeFromLeague?: boolean;
  /**
   * The END-CHECKPOINT (FABLE-C3; JK ruling queue 2026-07-01, audit FS-3): teams listed here —
   * the pure-pressure shills — never need to COMPLETE a roster. The auction ends when every team
   * NOT in this list is full; the forced filler skips them; their bid ceiling is their full
   * remaining budget (no completion to reserve for). ADDITIVE: absent (all saved sessions and
   * shill-less setups) keeps the historical everyone-must-fill semantics.
   */
  nonCompletingTeamIds?: readonly string[];
}

/** §6 Q3, §16 sim-tune: flat bid step scaled to the active tier cap by setup. */
export const DEFAULT_AUCTION_BID_INCREMENT = 5000;

/**
 * §6 Q1: fixed cyclic nomination order is seeded once at setup.
 * Setup callers should replace this deterministic placeholder before persisting.
 */
export const DEFAULT_AUCTION_NOMINATION_ORDER_SEED = 'auction-setup-seed';

/** §5.2 #1 / IV_ENGINE §7.6, §16 sim-tune: shills are opt-in by host count. */
export const DEFAULT_CPU_SHILL_COUNT = 0;

/**
 * §16 sim-tune / JK-PENDING (phantom-bidder count): default shill count scaled to league size.
 * PLACEHOLDER formula — the exact count is JK's call (assembly-plan open decision); this is the
 * tunable knob, not a final ruling. Override range in the UI is 0..(leagueSize-1) (need >=1 non-shill).
 */
export function scaledShillDefault(leagueSize: number): number {
  return Math.max(0, Math.floor(leagueSize / 3));
}

export const DEFAULT_NOMINATION_WEIGHT_EXPONENT = 2.5;

export const DEFAULT_AUCTION_SETUP_CONFIG: AuctionSetupConfig = {
  format: 'auction',
  bidIncrement: DEFAULT_AUCTION_BID_INCREMENT,
  turnTimerSeconds: null,
  nominationOrderSeed: DEFAULT_AUCTION_NOMINATION_ORDER_SEED,
  cpuShillCount: DEFAULT_CPU_SHILL_COUNT,
  excludeFromLeague: true,
};
