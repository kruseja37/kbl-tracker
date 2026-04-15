import type {
  NarrativeIntensity,
  NarrativeIntensityThresholds,
} from "../../../../types/reporterPreferences";

export const NARRATIVE_INTENSITY_LABEL: Record<NarrativeIntensity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const NARRATIVE_INTENSITY_DESCRIPTION: Record<NarrativeIntensity, string> = {
  low: "Only marquee moments get reporter attention; summary refreshes are sparse.",
  medium: "Balanced reporter presence with moderate commentary and summary refresh cadence.",
  high: "Most dramatic moments get coverage, with fuller columns and faster summary refreshes.",
};

export const NARRATIVE_INTENSITY_THRESHOLDS: Record<NarrativeIntensity, NarrativeIntensityThresholds> = {
  low: {
    commentaryWpaThreshold: 0.15,
    commentaryDramaticWeightThreshold: 4,
    summaryRegenDelta: 10,
    postGameColumnTargetWords: 150,
    opposingReporterColumn: "off",
    expectedGrokCallsPerGame: { min: 3, max: 5 },
  },
  medium: {
    commentaryWpaThreshold: 0.08,
    commentaryDramaticWeightThreshold: 2.5,
    summaryRegenDelta: 5,
    postGameColumnTargetWords: 300,
    opposingReporterColumn: "abbreviated",
    expectedGrokCallsPerGame: { min: 10, max: 15 },
  },
  high: {
    commentaryWpaThreshold: 0.04,
    commentaryDramaticWeightThreshold: 1.5,
    summaryRegenDelta: 3,
    postGameColumnTargetWords: 500,
    opposingReporterColumn: "full",
    expectedGrokCallsPerGame: { min: 25, max: 40 },
  },
};

export function getNarrativeIntensityThresholds(
  intensity: NarrativeIntensity,
): NarrativeIntensityThresholds {
  return NARRATIVE_INTENSITY_THRESHOLDS[intensity];
}
