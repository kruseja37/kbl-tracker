import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import type { FieldCoordinate } from '../components/FieldCanvas';
import type { RunnerDefaults } from '../components/runnerDefaults';
import type { PlayType as FieldingPlayType } from '../types/game';

export type HitType = '1B' | '2B' | '3B' | 'HR';
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
  runnerOutcomes?: RunnerDefaults;
  exitType?: 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
  playDifficulty?: 'routine' | 'likely' | 'difficult' | 'impossible';
  fieldingPlayType?: Extract<FieldingPlayType, 'routine' | 'charging' | 'running' | 'diving' | 'leaping' | 'sliding' | 'wall' | 'over_shoulder' | 'robbed_hr' | 'beat_runner' | 'beat_throw' | 'missed_dive' | 'missed_leap'>;
  sprayDirection?: 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
  inferredFielder?: number;
  wasOverridden?: boolean;
  inferenceConfidence?: number;
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
