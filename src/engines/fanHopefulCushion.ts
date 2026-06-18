/**
 * §4 / LS-7 Fan Hopeful timed cushion.
 *
 * A Fan Hopeful call-up grants (1) a one-time fan-morale LIFT because hope
 * sells tickets, and (2) a sustained early-slump morale CUSHION that reduces
 * negative fan-morale swings while the timed window is active. The honeymoon
 * expires after `windowGames`.
 *
 * DEFAULT-TAKEN: the LIFT is a one-time bump on the discrete call-up event;
 * the CUSHION is sustained while the window is active; the window is a
 * game-count window. The spec's "until next checkpoint" alternative is a
 * sim/wiring choice. All magnitudes are §16 sim placeholders.
 *
 * WIRING is a DEFERRED seam, NOT built here: at activation, a call-up event
 * fires `computeFanHopefulCallUpLift` once into fan morale, and per-game
 * fan-morale swings tied to the Fan Hopeful are passed through
 * `applyFanHopefulSlumpCushion` (gated by the Phase-2 morale flag). The
 * call-up event plus `team.fanHopefulPlayerId` window tracking is the
 * consumer's job. Build-dark.
 */
export interface FanHopefulCushionTuning {
  windowGames: number;
  fanMoraleLift: number;
  slumpCushionFactor: number;
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const FAN_HOPEFUL_CUSHION_TUNING: FanHopefulCushionTuning = {
  windowGames: 10,
  fanMoraleLift: 3,
  slumpCushionFactor: 0.5,
};

export interface FanHopefulWindowState {
  gamesSinceCallUp: number;
  active: boolean;
  expired: boolean;
  gamesRemaining: number;
}

export interface FanHopefulWindowLike {
  active: boolean;
}

export function computeFanHopefulWindowState(
  callUpGameNumber: number,
  currentGameNumber: number,
  config: FanHopefulCushionTuning = FAN_HOPEFUL_CUSHION_TUNING,
): FanHopefulWindowState {
  const gamesSinceCallUp = currentGameNumber - callUpGameNumber;
  // currentGameNumber before callUpGameNumber is a sane "not yet" state.
  const active = gamesSinceCallUp >= 0 && gamesSinceCallUp < config.windowGames;
  const expired = gamesSinceCallUp >= config.windowGames;

  return {
    gamesSinceCallUp,
    active,
    expired,
    gamesRemaining: active ? config.windowGames - gamesSinceCallUp : 0,
  };
}

export function computeFanHopefulCallUpLift(
  config: FanHopefulCushionTuning = FAN_HOPEFUL_CUSHION_TUNING,
): number {
  return config.fanMoraleLift;
}

export function applyFanHopefulSlumpCushion(
  baseFanMoraleSwing: number,
  windowState: FanHopefulWindowLike,
  config: FanHopefulCushionTuning = FAN_HOPEFUL_CUSHION_TUNING,
): number {
  if (windowState.active && baseFanMoraleSwing < 0) {
    return baseFanMoraleSwing * config.slumpCushionFactor;
  }

  return baseFanMoraleSwing;
}
