import type { NarrativeIntensity } from '../types/reporterPreferences';

/**
 * §13 line 230 — reporter intensity supporting tooth (pure signal engine).
 *
 * AUTH-4 DEFAULTS-TAKEN: heat scales ONLY with fan anger, meaning morale below
 * neutral. At or above neutral, press heat is 0 and intensity is "low" because
 * §13 only specifies the low-morale -> turn-up-the-heat direction. Band
 * thresholds and tone tags are §16-tunable placeholders.
 *
 * This module emits the signal only. The live reporter seam stays dark:
 * src/src_figma/app/engines/reporter/seasonNewsGenerator.ts:165 currently
 * hardcodes `intensity: "medium"`; at post-D13 activation that becomes
 * `computeReporterHeat(fanMorale).intensity`.
 */
export interface ReporterIntensityTuning {
  neutralMorale: number;
  lowHeatBand: number;
  highHeatBand: number;
  toneDirectives: Record<NarrativeIntensity, string>;
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const REPORTER_INTENSITY_TUNING: ReporterIntensityTuning = {
  neutralMorale: 50,
  lowHeatBand: 0.33,
  highHeatBand: 0.66,
  toneDirectives: {
    low: 'press_calm',
    medium: 'press_critical',
    high: 'press_scorching',
  },
};

export interface ReporterHeatResult {
  intensity: NarrativeIntensity;
  heat: number;
  toneDirective: string;
  components: {
    teamFanMorale: number;
    pressHeat: number;
    band: NarrativeIntensity;
  };
}

export function computeReporterHeat(
  teamFanMorale: number,
  config: ReporterIntensityTuning = REPORTER_INTENSITY_TUNING,
): ReporterHeatResult {
  const pressHeat = clamp(
    (config.neutralMorale - teamFanMorale) / config.neutralMorale,
    0,
    1,
  );
  const intensity = getIntensityBand(pressHeat, config);

  return {
    intensity,
    heat: pressHeat,
    toneDirective: config.toneDirectives[intensity],
    components: {
      teamFanMorale,
      pressHeat,
      band: intensity,
    },
  };
}

function getIntensityBand(
  pressHeat: number,
  config: ReporterIntensityTuning,
): NarrativeIntensity {
  if (pressHeat < config.lowHeatBand) {
    return 'low';
  }

  if (pressHeat < config.highHeatBand) {
    return 'medium';
  }

  return 'high';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
