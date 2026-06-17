import {
  type AdaptiveStandardsConfig,
  scaledThreshold,
} from './franchiseAdaptiveStandards';

export const QUALIFIED_PA_BASELINE = 502;
export const QUALIFIED_IP_BASELINE = 162;

export interface FranchiseAwardQualifierThresholds {
  minPlateAppearances: number;
  minInningsPitched: number;
}

export function awardQualifierThresholds(
  config: AdaptiveStandardsConfig,
): FranchiseAwardQualifierThresholds {
  return {
    minPlateAppearances: scaledThreshold(QUALIFIED_PA_BASELINE, config, 'season'),
    minInningsPitched: scaledThreshold(QUALIFIED_IP_BASELINE, config, 'combined'),
  };
}
