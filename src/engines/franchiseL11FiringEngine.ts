import type { CanonicalPersonality } from './masterMoraleMatrix';

export interface FranchiseL11FiringPlayer {
  id: string;
  valueDelta: number;
  personality: CanonicalPersonality;
  loyalty?: number;
  resilience?: number;
}

export interface FranchiseL11FiringInput {
  teamFanMorale: number;
  players: readonly FranchiseL11FiringPlayer[];
  reason?: 'user' | 'auto-backstop' | 'rebrand';
}

export interface FranchiseL11PlayerRipple {
  playerId: string;
  moraleDelta: number;
  untouchable: boolean;
}

export interface FranchiseL11FiringReport {
  reliefBumpDelta: number;
  playerRipples: FranchiseL11PlayerRipple[];
  managerSelfDelta: number;
}

export interface FranchiseL11FiringTuning {
  neutralMorale: number;
  reliefBase: number;
  reliefStruggleScale: number;
  reliefMax: number;
  managerSelfBase: number;
  rippleBase: number;
  valueDeltaScale: number;
  rippleFloor: number;
  loyaltyWeight: number;
  resilienceWeight: number;
  personalitySensitivity: Record<CanonicalPersonality, number>;
}

// Section 16 SIM-TUNE placeholders owned locally by the L11 manager-firing engine.
export const FRANCHISE_L11_FIRING_TUNING: FranchiseL11FiringTuning = {
  neutralMorale: 50,
  reliefBase: 4,
  reliefStruggleScale: 2,
  reliefMax: 12,
  managerSelfBase: -2,
  rippleBase: -2,
  valueDeltaScale: 200000,
  rippleFloor: -6,
  loyaltyWeight: 0.5,
  resilienceWeight: 0.5,
  personalitySensitivity: {
    COMPETITIVE: 1.0,
    RELAXED: 0.9,
    DROOPY: 1.15,
    JOLLY: 0.9,
    TOUGH: 0.7,
    TIMID: 1.2,
    EGOTISTICAL: 0.5,
  },
};

export function computeFranchiseL11Firing(
  input: FranchiseL11FiringInput,
  tuning: FranchiseL11FiringTuning = FRANCHISE_L11_FIRING_TUNING,
): FranchiseL11FiringReport {
  const fan = clamp(input.teamFanMorale, 0, 100);
  const struggle = Math.max(0, (tuning.neutralMorale - fan) / tuning.neutralMorale);
  const reliefBumpDelta = clamp(
    tuning.reliefBase * (1 + tuning.reliefStruggleScale * struggle),
    0,
    tuning.reliefMax,
  );

  const playerRipples = input.players
    .map((player): FranchiseL11PlayerRipple => {
      if (player.valueDelta >= 0) {
        return {
          playerId: player.id,
          moraleDelta: 0,
          untouchable: true,
        };
      }

      const severity = clamp(Math.abs(player.valueDelta) / tuning.valueDeltaScale, 0, 1);
      const loyalty = player.loyalty ?? tuning.neutralMorale;
      const resilience = player.resilience ?? tuning.neutralMorale;
      const loyaltyFactor = 1 + tuning.loyaltyWeight * (loyalty - tuning.neutralMorale) / tuning.neutralMorale;
      const resilienceFactor = 1 - tuning.resilienceWeight * (resilience - tuning.neutralMorale) / tuning.neutralMorale;
      const tilt = Math.max(
        0,
        tuning.personalitySensitivity[player.personality] * loyaltyFactor * resilienceFactor,
      );
      const moraleDelta = clamp(tuning.rippleBase * severity * tilt, tuning.rippleFloor, 0);

      return {
        playerId: player.id,
        moraleDelta,
        untouchable: false,
      };
    })
    .sort((a, b) => compareString(a.playerId, b.playerId));

  return {
    reliefBumpDelta,
    playerRipples,
    managerSelfDelta: tuning.managerSelfBase,
  };
}

function compareString(a: string, b: string): number {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
