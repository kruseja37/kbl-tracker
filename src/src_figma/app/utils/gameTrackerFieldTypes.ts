import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import type { AtBatEvent } from '../../../utils/eventLog';
import type { FieldCoordinate } from '../components/FieldCanvas';
import type { RunnerDefaults } from '../components/runnerDefaults';
import type { PlayType as FieldingPlayType } from '../types/game';

export type HitType = '1B' | '2B' | '3B' | 'HR' | 'ITPHR';
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'FLO' | 'DP' | 'TP' | 'K' | 'Kc' | 'FC' | 'SAC' | 'SF';
export type WalkType = 'BB' | 'IBB' | 'HBP';
export type ErrorType = 'FIELDING' | 'THROWING' | 'MENTAL';

export interface PlayData {
  type: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error' | 'walk';
  hitType?: HitType;
  outType?: OutType;
  walkType?: WalkType;
  fieldingSequence: number[];
  ballLocation?: FieldCoordinate;
  batterLocation?: FieldCoordinate;
  isFoul?: boolean;
  foulType?: string;
  hrDistance?: number;
  hrType?: string;
  spraySector?: string;
  errorType?: ErrorType;
  errorFielder?: number;
  batterReachedOnError?: AtBatEvent['batterReachedOnError'];
  batterErrorType?: AtBatEvent['batterErrorType'];
  batterErrorChargedToPosition?: AtBatEvent['batterErrorChargedToPosition'];
  runnerOutcomes?: RunnerDefaults;
  persistedRunnerOutcomes?: AtBatEvent['runnerOutcomes'];
  exitType?: 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
  playDifficulty?: 'routine' | 'likely' | 'difficult' | 'impossible';
  fieldingPlayType?: Extract<FieldingPlayType, 'routine' | 'charging' | 'running' | 'diving' | 'leaping' | 'sliding' | 'wall' | 'over_shoulder' | 'robbed_hr' | 'failed_robbery' | 'beat_runner' | 'beat_throw' | 'missed_dive' | 'missed_leap'>;
  sprayDirection?: 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
  inferredFielder?: number;
  wasOverridden?: boolean;
  inferenceConfidence?: number;
  savedRun?: boolean;
  extraGemCreditPositions?: number[];
  dpType?: string;
  leverageIndex?: number;
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  gameSituation?: {
    inning: number;
    isTop: boolean;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  };
  isClutchSituation?: boolean;
  playoffContext?: {
    isPlayoffs: boolean;
    round?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
    isEliminationGame?: boolean;
    isClinchGame?: boolean;
  };
  fameValue?: number;
  fameEventType?: string;
}

export type SpecialEventType =
  | 'WEB_GEM'
  | 'ROBBERY'
  | 'TOOTBLAN'
  | 'KILLED_PITCHER'
  | 'NUT_SHOT'
  | 'BEAT_THROW'
  | 'BEAT_RUNNER'
  | 'BUNT'
  | 'STRIKEOUT'
  | 'STRIKEOUT_LOOKING'
  | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB';

export interface SpecialEventData {
  eventType: SpecialEventType;
  fielderPosition?: number;
  fielderName?: string;
  batterId?: string;
  batterName?: string;
  runnerId?: string;
  injuryStayedIn?: boolean;
  newFitness?: Extract<FitnessState, 'STRAINED' | 'WEAK' | 'HURT'>;
  mojoImpact?: 'TENSE' | 'RATTLED';
  newMojo?: MojoLevel;
  leverageIndex?: number;
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  isClutchSituation?: boolean;
  fameValue?: number;
  baseFame?: number;
}

export interface BaseOccupancy {
  first: boolean;
  second: boolean;
  third: boolean;
}

const DEFAULT_BASE_OCCUPANCY: BaseOccupancy = {
  first: false,
  second: false,
  third: false,
};

const DP_PIVOT_BY_PRIMARY: Partial<Record<number, number>> = {
  1: 6,
  4: 6,
  5: 4,
  6: 4,
};

const INFIELD_FIELDER_BY_DIRECTION: Partial<Record<string, number>> = {
  Left: 5,
  'Left-Center': 6,
  Center: 1,
  'Right-Center': 4,
  Right: 3,
  'Foul-Left': 5,
  'Foul-Right': 3,
};

const OUTFIELD_FIELDER_BY_DIRECTION: Partial<Record<string, number>> = {
  Left: 7,
  'Left-Center': 8,
  Center: 8,
  'Right-Center': 8,
  Right: 9,
  'Foul-Left': 7,
  'Foul-Right': 9,
};

const POPUP_FIELDER_BY_DIRECTION: Partial<Record<string, number>> = {
  Left: 5,
  'Left-Center': 6,
  Center: 6,
  'Right-Center': 4,
  Right: 3,
  'Foul-Left': 5,
  'Foul-Right': 3,
};

const GROUND_RESULTS = new Set(['GO', 'DP', 'TP', 'FC', 'SAC']);
const FLY_RESULTS = new Set(['FO', 'FLO', 'SF']);
const HIT_OR_ERROR_RESULTS = new Set(['1B', '2B', '3B', 'GRD', 'ITPHR', 'E']);

export interface SprayFielderInferenceInput {
  result: string;
  direction?: string | null;
  depthIndex?: number;
  depthCount?: number;
}

function isOutfieldSprayDepth(depthIndex?: number, depthCount?: number): boolean {
  if (typeof depthIndex !== 'number' || typeof depthCount !== 'number') {
    return false;
  }

  // The hit/error spray layout is intentionally 3 infield bands + 4 outfield bands.
  if (depthCount === 7) {
    return depthIndex >= 3;
  }

  // For 3-band line-drive charts, the innermost band behaves like the infield.
  return depthIndex >= Math.ceil(depthCount / 3);
}

export function inferPrimaryFielderPositionFromSpray({
  result,
  direction,
  depthIndex,
  depthCount,
}: SprayFielderInferenceInput): number | null {
  if (!direction) {
    return null;
  }

  if (result === 'HR') {
    return null;
  }

  if (GROUND_RESULTS.has(result)) {
    return INFIELD_FIELDER_BY_DIRECTION[direction] ?? null;
  }

  if (FLY_RESULTS.has(result)) {
    return OUTFIELD_FIELDER_BY_DIRECTION[direction] ?? null;
  }

  if (result === 'PO') {
    return POPUP_FIELDER_BY_DIRECTION[direction] ?? null;
  }

  if (result === 'LO') {
    return isOutfieldSprayDepth(depthIndex, depthCount)
      ? OUTFIELD_FIELDER_BY_DIRECTION[direction] ?? null
      : INFIELD_FIELDER_BY_DIRECTION[direction] ?? null;
  }

  if (HIT_OR_ERROR_RESULTS.has(result)) {
    return isOutfieldSprayDepth(depthIndex, depthCount)
      ? OUTFIELD_FIELDER_BY_DIRECTION[direction] ?? null
      : INFIELD_FIELDER_BY_DIRECTION[direction] ?? null;
  }

  return null;
}

export function inferAssistChain(
  result: string,
  primaryFielderPosition: number,
  bases: BaseOccupancy = DEFAULT_BASE_OCCUPANCY,
): number[] {
  if (!primaryFielderPosition || primaryFielderPosition < 1) {
    return [];
  }

  if (result === 'GO') {
    return primaryFielderPosition === 3
      ? [3]
      : [primaryFielderPosition, 3];
  }

  if (result === 'FC') {
    let forceTarget: number | null = null;

    if (bases.first) {
      forceTarget = 4;
    } else if (bases.second) {
      forceTarget = 5;
    }

    if (!forceTarget) {
      return [primaryFielderPosition];
    }

    return forceTarget === primaryFielderPosition
      ? [primaryFielderPosition, primaryFielderPosition]
      : [primaryFielderPosition, forceTarget];
  }

  if (result === 'DP') {
    const pivot = DP_PIVOT_BY_PRIMARY[primaryFielderPosition];

    if (primaryFielderPosition === 3) {
      return [3];
    }

    if (!pivot) {
      return [primaryFielderPosition, 3];
    }

    return [primaryFielderPosition, pivot, 3];
  }

  return [primaryFielderPosition];
}
