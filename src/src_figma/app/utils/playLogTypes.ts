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
}
