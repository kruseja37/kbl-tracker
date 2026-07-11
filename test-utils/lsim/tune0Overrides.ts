import { CHECKPOINT_DEV_TUNING } from '../../src/utils/franchiseCheckpointSweepCompute';
import { FAN_DAMPENER_TUNING } from '../../src/engines/fanMoraleDampener';
import { FAME_TUNING } from '../../src/engines/fameModel';
import { MORALE_TUNING } from '../../src/engines/masterMoraleMatrix';
import { RELATIONSHIP_FORMATION_TUNING } from '../../src/engines/relationshipFormation';
import { FRANCHISE_L11_FIRING_BACKLASH_TUNING } from '../../src/engines/franchiseL11FiringEngine';

export type Tune0SweepableKnobId =
  | 'performance-signal-scale'
  | 'fan-dampener-strength'
  | 'age-gravity-band-slopes'
  | 'fame-decay-per-update'
  | 'morale-personality-spread'
  | 'relationship-formation-threshold'
  | 'k5-backlash-curve';

export interface Tune0OverrideSpec {
  knobId: Tune0SweepableKnobId;
  factor: number;
}

type MutableRecord = Record<string, unknown>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function restoreObject(target: object, snapshot: object): void {
  for (const key of Object.keys(target)) delete (target as MutableRecord)[key];
  Object.assign(target, clone(snapshot));
}

function scaleFromNeutral(value: number, factor: number): number {
  return 1 + ((value - 1) * factor);
}

export function describeTune0Override(spec: Tune0OverrideSpec): Record<string, unknown> {
  switch (spec.knobId) {
    case 'performance-signal-scale':
      return { performanceSignalScale: 200000 * spec.factor };
    case 'fan-dampener-strength':
      return { baseStrength: 0.6 * spec.factor, maxDampenHeld: 0.9 };
    case 'age-gravity-band-slopes':
      return {
        ageCurveSlopeByBand: Object.fromEntries(
          Object.entries(CHECKPOINT_DEV_TUNING.ageCurveSlopeByBand).map(([band, value]) => [band, value * spec.factor]),
        ),
      };
    case 'fame-decay-per-update':
      return { decayPerUpdate: 0.85 * spec.factor };
    case 'morale-personality-spread':
      return {
        transform: '1 + (default - 1) * factor',
        factor: spec.factor,
      };
    case 'relationship-formation-threshold':
      return {
        thresholds: Object.fromEntries(
          Object.entries(RELATIONSHIP_FORMATION_TUNING.thresholds).map(([type, value]) => [type, value * spec.factor]),
        ),
        seededThresholdWindowHeld: RELATIONSHIP_FORMATION_TUNING.seededThresholdWindow,
      };
    case 'k5-backlash-curve':
      return {
        maxBacklashMagnitude: 4 * spec.factor,
        maxFanMoraleHeld: 100,
      };
  }
}

export async function withTune0Override<T>(
  spec: Tune0OverrideSpec,
  run: () => Promise<T>,
): Promise<T> {
  const checkpointSnapshot = clone(CHECKPOINT_DEV_TUNING);
  const dampenerSnapshot = clone(FAN_DAMPENER_TUNING);
  const fameSnapshot = clone(FAME_TUNING);
  const moraleSnapshot = clone(MORALE_TUNING);
  const relationshipSnapshot = clone(RELATIONSHIP_FORMATION_TUNING);
  const backlashSnapshot = clone(FRANCHISE_L11_FIRING_BACKLASH_TUNING);

  try {
    switch (spec.knobId) {
      case 'performance-signal-scale':
        CHECKPOINT_DEV_TUNING.performanceSignalScale = checkpointSnapshot.performanceSignalScale * spec.factor;
        break;
      case 'fan-dampener-strength':
        FAN_DAMPENER_TUNING.baseStrength = dampenerSnapshot.baseStrength * spec.factor;
        break;
      case 'age-gravity-band-slopes':
        for (const band of Object.keys(CHECKPOINT_DEV_TUNING.ageCurveSlopeByBand)) {
          const typedBand = band as keyof typeof CHECKPOINT_DEV_TUNING.ageCurveSlopeByBand;
          CHECKPOINT_DEV_TUNING.ageCurveSlopeByBand[typedBand] =
            checkpointSnapshot.ageCurveSlopeByBand[typedBand] * spec.factor;
        }
        break;
      case 'fame-decay-per-update':
        FAME_TUNING.heat.decayPerUpdate = fameSnapshot.heat.decayPerUpdate * spec.factor;
        break;
      case 'morale-personality-spread':
        for (const personality of Object.keys(MORALE_TUNING.personality)) {
          const current = (MORALE_TUNING.personality as unknown as Record<string, Record<string, number>>)[personality];
          const baseline = (moraleSnapshot.personality as unknown as Record<string, Record<string, number>>)[personality];
          for (const key of Object.keys(current)) current[key] = scaleFromNeutral(baseline[key], spec.factor);
        }
        break;
      case 'relationship-formation-threshold':
        for (const type of Object.keys(RELATIONSHIP_FORMATION_TUNING.thresholds)) {
          const current = RELATIONSHIP_FORMATION_TUNING.thresholds as unknown as Record<string, number>;
          const baseline = relationshipSnapshot.thresholds as unknown as Record<string, number>;
          current[type] = baseline[type] * spec.factor;
        }
        break;
      case 'k5-backlash-curve':
        (FRANCHISE_L11_FIRING_BACKLASH_TUNING as unknown as { maxBacklashMagnitude: number }).maxBacklashMagnitude =
          backlashSnapshot.maxBacklashMagnitude * spec.factor;
        break;
    }
    return await run();
  } finally {
    restoreObject(CHECKPOINT_DEV_TUNING, checkpointSnapshot);
    restoreObject(FAN_DAMPENER_TUNING, dampenerSnapshot);
    restoreObject(FAME_TUNING, fameSnapshot);
    restoreObject(MORALE_TUNING, moraleSnapshot);
    restoreObject(RELATIONSHIP_FORMATION_TUNING, relationshipSnapshot);
    restoreObject(FRANCHISE_L11_FIRING_BACKLASH_TUNING, backlashSnapshot);
  }
}
