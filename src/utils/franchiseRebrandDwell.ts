export const REBRAND_RESET_MORALE = 70;

// §16 sim-tune: rock-bottom fan-morale ceiling for arming the rebrand offer.
export const REBRAND_DWELL_BAND_MAX = 20;

// §16 sim-tune: consecutive rock-bottom games required before the offer arms.
export const REBRAND_DWELL_TRIGGER_GAMES = 20;

export interface RebrandDwellResult {
  consecutiveRockBottomGames: number;
  armed: boolean;
}

export function computeRebrandDwell(fanMoraleHistory: number[]): RebrandDwellResult {
  let consecutiveRockBottomGames = 0;

  for (let index = fanMoraleHistory.length - 1; index >= 0; index -= 1) {
    if (fanMoraleHistory[index] <= REBRAND_DWELL_BAND_MAX) {
      consecutiveRockBottomGames += 1;
    } else {
      break;
    }
  }

  return {
    consecutiveRockBottomGames,
    armed: consecutiveRockBottomGames >= REBRAND_DWELL_TRIGGER_GAMES,
  };
}
