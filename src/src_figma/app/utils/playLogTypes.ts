import type {
  ManagerDecisionSource,
  ManagerRunPlay,
  ManagerRunnerIntent,
} from "../../../types/managerWpa";

export type PlayLogResultCategory = 'hit' | 'out' | 'walk' | 'error' | 'special';

export type PlayLogEventType =
  | 'at_bat'
  | 'stolen_base'
  | 'caught_stealing'
  | 'pickoff'
  | 'wild_pitch'
  | 'passed_ball'
  | 'balk'
  | 'runner_advance'
  | 'substitution'
  | 'position_change'
  | 'pitcher_change'
  | 'mojo_change'
  | 'fitness_change'
  | 'injury'
  | 'manager_moment'
  | 'pitch_count_update';

export type PlayLogEditorType =
  | 'batter_at_bat'
  | 'runner'
  | 'lineup_pitching'
  | 'context_modifiers';

export type RunnerBase = 'batter' | 'first' | 'second' | 'third';
export type RunnerDestination = 'first' | 'second' | 'third' | 'home' | 'out' | 'end';
export type RunnerHoldBaseSaved = '2B' | '3B' | 'HOME';

export interface RunnerSubEntry {
  id: string;
  parentEventId: string;
  runnerId: string;
  runnerName: string;
  fromBase: RunnerBase;
  toBase: RunnerDestination;
  parentResult?: string;
  isEnrichable: boolean;
  // Enrichment fields (UX-050)
  fieldingSequence?: number[];
  playMechanic?: string;
  fielderId?: string;
  fielderPosition?: 'LF' | 'CF' | 'RF';
  heldByOf?: boolean;
  holdingFielder?: 'LF' | 'CF' | 'RF';
  baseSaved?: RunnerHoldBaseSaved;
  isTootblan?: boolean;
  isOutAdvancing?: boolean;
  managerIntent?: ManagerRunnerIntent;
  managerRunPlay?: ManagerRunPlay;
  managerDecisionSource?: ManagerDecisionSource;
  managerDecisionNote?: string;
  errorType?: 'fielding' | 'throwing' | 'mental';
  errorChargedTo?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  transitionLabel?: string;
}

export interface PlayLogEntry {
  id: string;
  eventId?: string;
  eventType: PlayLogEventType;
  editorType: PlayLogEditorType;
  visibility: 'default' | 'system';
  isSelectable: boolean;
  inningLabel: string;
  batterName: string;
  result: string;
  resultCategory: PlayLogResultCategory;
  rbi: number;
  runsScored: number;
  description?: string;
  hasFieldingData: boolean;
  hasLocationData: boolean;
  hasKType: boolean;
  hasPitchCount: boolean;
  hasPitchType: boolean;
  isEnrichable: boolean;
  isQAB: boolean;
  fieldingSequence?: string;
  timestamp: number;
  runnerSubEntries?: RunnerSubEntry[];
}
