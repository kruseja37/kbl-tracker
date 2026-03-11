import type { SpecialPlayType } from '../../../types/game';
import type { FieldingEvent } from '../../../utils/eventLog';

export type FieldingPlayTypeValue =
  | 'routine'
  | 'charging'
  | 'running'
  | 'diving'
  | 'leaping'
  | 'sliding'
  | 'wall'
  | 'over_shoulder'
  | 'robbed_hr'
  | 'beat_throw'
  | 'missed_dive'
  | 'missed_leap';

export const FIELDING_PLAY_TYPE_OPTIONS: Array<{
  value: FieldingPlayTypeValue;
  label: string;
}> = [
  { value: 'routine', label: 'Routine' },
  { value: 'charging', label: 'Charging' },
  { value: 'running', label: 'Running' },
  { value: 'diving', label: 'Diving' },
  { value: 'leaping', label: 'Leaping' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'wall', label: 'Wall Catch' },
  { value: 'over_shoulder', label: 'Over Shoulder' },
  { value: 'robbed_hr', label: 'Robbed HR' },
  { value: 'beat_throw', label: 'Beat Throw' },
  { value: 'missed_dive', label: 'Missed Dive' },
  { value: 'missed_leap', label: 'Missed Leap' },
] as const;

export function mapFieldingPlayTypeToPlayDifficulty(
  fieldingPlayType?: FieldingPlayTypeValue,
): 'routine' | 'likely' | 'difficult' | 'impossible' | undefined {
  switch (fieldingPlayType) {
    case 'routine':
      return 'routine';
    case 'charging':
    case 'running':
    case 'beat_throw':
      return 'likely';
    case 'diving':
    case 'leaping':
    case 'sliding':
    case 'over_shoulder':
    case 'missed_dive':
    case 'missed_leap':
      return 'difficult';
    case 'wall':
      return 'difficult';
    case 'robbed_hr':
      return 'impossible';
    default:
      return undefined;
  }
}

export function mapFieldingPlayTypeToPersistedDifficulty(
  fieldingPlayType?: FieldingPlayTypeValue,
): FieldingEvent['difficulty'] {
  switch (fieldingPlayType) {
    case 'routine':
      return 'routine';
    case 'charging':
    case 'running':
    case 'beat_throw':
      return 'likely';
    case 'diving':
    case 'leaping':
    case 'sliding':
    case 'over_shoulder':
    case 'missed_dive':
    case 'missed_leap':
      return '50-50';
    case 'wall':
      return 'unlikely';
    case 'robbed_hr':
      return 'spectacular';
    default:
      return 'routine';
  }
}

export function mapFieldingPlayTypeToSpecialPlayType(
  fieldingPlayType?: FieldingPlayTypeValue,
): SpecialPlayType | null {
  switch (fieldingPlayType) {
    case 'routine':
      return 'Routine';
    case 'charging':
      return 'Charging';
    case 'running':
      return 'Running';
    case 'diving':
      return 'Diving';
    case 'leaping':
      return 'Leaping';
    case 'sliding':
      return 'Sliding';
    case 'wall':
      return 'Wall Catch';
    case 'over_shoulder':
      return 'Over Shoulder';
    case 'robbed_hr':
      return 'Robbed HR';
    case 'beat_throw':
      return 'Beat Throw';
    case 'missed_dive':
      return 'Missed Dive';
    case 'missed_leap':
      return 'Missed Leap';
    default:
      return null;
  }
}
