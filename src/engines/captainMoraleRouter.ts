/**
 * §4 / LS-6 Team Captain morale ROUTER.
 *
 * The Captain has two routing-only jobs: (1) his Charisma counts DOUBLE toward
 * teammate morale while he holds the badge; (2) morale swings tied to the
 * Captain's OWN performance are amplified team-wide.
 *
 * ANTI-DOUBLE-COUNT: this engine routes/amplifies the clubhouse MORALE channel
 * ONLY. It does NOT move the Captain's own ratings/development (Charisma never
 * moves his own ratings, §6 line 113), and it does NOT implement the §24.9
 * leadership-effectiveness composite (Charisma+Loyalty+Resilience-Ambition -
 * that governs relationship edge suppression/catalysis and is L13, a separate
 * ticket). Selection uses Charisma+Loyalty (2 modifiers); routing (here) uses
 * Charisma x2; effectiveness (L13) uses 4 modifiers - three distinct uses, no
 * double-count.
 *
 * WIRING is a DEFERRED seam, NOT built here: at activation the master morale
 * matrix would (a) apply `applyCaptainCharismaRouting` when distributing the
 * Captain's clubhouse charisma to teammates, and (b) apply
 * `applyCaptainPerformanceSwingAmplification` to team-wide morale swings whose
 * subject is the badge-holding Captain (gated by the Phase-2 morale flag).
 * Build-dark.
 */
export interface CaptainMoraleRouterTuning {
  charismaRoutingMultiplier: number;
  captainPerformanceSwingMultiplier: number;
  charismaNeutral: number;
}

// §16 SIM-TUNE placeholders — shape locked. Charisma routing x2 is §4/LS-6 canonical.
export const CAPTAIN_MORALE_ROUTER_TUNING: CaptainMoraleRouterTuning = {
  charismaRoutingMultiplier: 2,
  captainPerformanceSwingMultiplier: 1.5,
  charismaNeutral: 50,
};

export interface CaptainCharismaRoutingResult {
  captainCharisma: number;
  baseRouting: number;
  captainRouting: number;
  multiplier: number;
}

export function computeCaptainCharismaRouting(
  captainCharisma: number,
  config: CaptainMoraleRouterTuning = CAPTAIN_MORALE_ROUTER_TUNING,
): CaptainCharismaRoutingResult {
  const baseRouting = (captainCharisma - config.charismaNeutral) / config.charismaNeutral;
  const captainRouting = baseRouting * config.charismaRoutingMultiplier;

  return {
    captainCharisma,
    baseRouting,
    captainRouting,
    multiplier: config.charismaRoutingMultiplier,
  };
}

export function applyCaptainCharismaRouting(
  baseCharismaRouting: number,
  config: CaptainMoraleRouterTuning = CAPTAIN_MORALE_ROUTER_TUNING,
): number {
  return baseCharismaRouting * config.charismaRoutingMultiplier;
}

export function applyCaptainPerformanceSwingAmplification(
  baseTeamSwing: number,
  config: CaptainMoraleRouterTuning = CAPTAIN_MORALE_ROUTER_TUNING,
): number {
  if (baseTeamSwing === 0) {
    return 0;
  }

  return baseTeamSwing * config.captainPerformanceSwingMultiplier;
}
