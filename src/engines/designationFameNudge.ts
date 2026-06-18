import type { FranchiseDesignationType } from '../utils/franchiseDesignations';

/**
 * §20.4 / §20.6 Channel C — one-time designation -> fame naming seed.
 *
 * This nudge is earned ONCE when a player is named to a store-backed team
 * designation. It is not a per-game effect. The firing-on-naming seam,
 * once-per-naming idempotency, and fame-store write are deliberately deferred
 * to a follow-on / post-D13 activation because that work touches designation
 * events plus the fame store. This module stays build-dark and pure.
 */
export interface DesignationFameNudgeTuning {
  nudgeByType: Record<FranchiseDesignationType, number>;
}

// §16 SIM-TUNE placeholders — FF +2 / Albatross -1 are spec-canonical;
// TEAM_MVP/ACE are positive placeholders, magnitudes TBD/sim. Shape locked.
export const DESIGNATION_FAME_NUDGE_TUNING: DesignationFameNudgeTuning = {
  nudgeByType: {
    FAN_FAVORITE: 2,
    ALBATROSS: -1,
    TEAM_MVP: 1.5,
    ACE: 1.5,
  },
};

export interface DesignationFameNudgeResult {
  type: FranchiseDesignationType;
  fameNudge: number;
  sign: 'positive' | 'negative' | 'neutral';
  reason: string;
}

export function computeDesignationFameNudge(
  type: FranchiseDesignationType,
  config: DesignationFameNudgeTuning = DESIGNATION_FAME_NUDGE_TUNING,
): DesignationFameNudgeResult {
  const fameNudge = config.nudgeByType[type];

  return {
    type,
    fameNudge,
    sign: getNudgeSign(fameNudge),
    reason: getNudgeReason(type),
  };
}

export function summarizeDesignationFameNudges(
  types: FranchiseDesignationType[],
  config: DesignationFameNudgeTuning = DESIGNATION_FAME_NUDGE_TUNING,
): {
  totalNudge: number;
  perType: Array<{ type: FranchiseDesignationType; fameNudge: number }>;
} {
  const perType = types.map((type) => ({
    type,
    fameNudge: config.nudgeByType[type],
  }));

  return {
    totalNudge: perType.reduce((total, item) => total + item.fameNudge, 0),
    perType,
  };
}

function getNudgeSign(fameNudge: number): DesignationFameNudgeResult['sign'] {
  if (fameNudge > 0) {
    return 'positive';
  }

  if (fameNudge < 0) {
    return 'negative';
  }

  return 'neutral';
}

function getNudgeReason(type: FranchiseDesignationType): string {
  switch (type) {
    case 'FAN_FAVORITE':
      return 'designation_fame_nudge.fan_favorite_warmth';
    case 'ALBATROSS':
      return 'designation_fame_nudge.albatross_irritation';
    case 'TEAM_MVP':
    case 'ACE':
      return 'designation_fame_nudge.merit_honor';
  }
}
