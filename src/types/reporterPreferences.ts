export type NarrativeIntensity = "low" | "medium" | "high";

export interface UserPreferences {
  key: "default";
  narrativeIntensity: NarrativeIntensity;
  softMonthlyBudget: number;
  lastModified: number;
}

export interface NarrativeIntensityThresholds {
  commentaryWpaThreshold: number;
  commentaryDramaticWeightThreshold: number;
  summaryRegenDelta: number;
  postGameColumnTargetWords: number;
  opposingReporterColumn: "off" | "abbreviated" | "full";
  expectedGrokCallsPerGame: {
    min: number;
    max: number;
  };
}

export const DEFAULT_NARRATIVE_INTENSITY: NarrativeIntensity = "medium";
export const DEFAULT_SOFT_MONTHLY_BUDGET = 5;
