import type { SpecialPlayType } from '../../../types/game';
import type { FieldingEvent } from '../../../utils/eventLog';

// ──────────────────────────────────────────────────────────────
// Layer A — Fielding Attempt (§8.1)
// Two sub-fields: Attempt Type + Attempt Outcome
// ──────────────────────────────────────────────────────────────

export type FieldingAttemptType =
  | 'routine'
  | 'diving'
  | 'jumping'
  | 'sliding'
  | 'charging'
  | 'over_shoulder'
  | 'wall'
  | 'robbed_hr';

export const FIELDING_ATTEMPT_TYPE_OPTIONS: Array<{
  value: FieldingAttemptType;
  label: string;
}> = [
  { value: 'routine', label: 'Routine' },
  { value: 'diving', label: 'Diving' },
  { value: 'jumping', label: 'Jumping' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'charging', label: 'Charging' },
  { value: 'over_shoulder', label: 'Over Shoulder' },
  { value: 'wall', label: 'Wall' },
  { value: 'robbed_hr', label: 'Robbed HR' },
] as const;

export type FieldingAttemptOutcome = 'made' | 'missed';

export const FIELDING_ATTEMPT_OUTCOME_OPTIONS: Array<{
  value: FieldingAttemptOutcome;
  label: string;
}> = [
  { value: 'made', label: 'Made' },
  { value: 'missed', label: 'Missed' },
] as const;

// ──────────────────────────────────────────────────────────────
// Layer B — Play Mechanic (§8.1)
// ──────────────────────────────────────────────────────────────

export type PlayMechanic =
  | 'routine'
  | 'relay'
  | 'rundown'
  | 'tag_play'
  | 'unassisted'
  | 'deflection';

export const PLAY_MECHANIC_OPTIONS: Array<{
  value: PlayMechanic;
  label: string;
}> = [
  { value: 'routine', label: 'Routine' },
  { value: 'relay', label: 'Relay' },
  { value: 'rundown', label: 'Rundown' },
  { value: 'tag_play', label: 'Tag Play' },
  { value: 'unassisted', label: 'Unassisted' },
  { value: 'deflection', label: 'Deflection' },
] as const;

// ──────────────────────────────────────────────────────────────
// Legacy FieldingPlayTypeValue (kept for backward compatibility
// with persistence layer and downstream consumers)
// ──────────────────────────────────────────────────────────────

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
  | 'beat_runner'
  | 'beat_throw'
  | 'missed_dive'
  | 'missed_leap';

/** @deprecated Use FIELDING_ATTEMPT_TYPE_OPTIONS + PLAY_MECHANIC_OPTIONS instead */
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
  { value: 'beat_runner', label: 'Beat Runner' },
  { value: 'beat_throw', label: 'Beat Throw' },
  { value: 'missed_dive', label: 'Missed Dive' },
  { value: 'missed_leap', label: 'Missed Leap' },
] as const;

// ──────────────────────────────────────────────────────────────
// Mapping: New taxonomy → legacy FieldingPlayTypeValue
// Used for persistence compatibility
// ──────────────────────────────────────────────────────────────

export function mapAttemptToLegacyFieldingPlayType(
  attemptType: FieldingAttemptType,
  outcome: FieldingAttemptOutcome,
): FieldingPlayTypeValue {
  if (outcome === 'missed') {
    if (attemptType === 'diving') return 'missed_dive';
    if (attemptType === 'jumping') return 'missed_leap';
    // For other missed attempts, map to closest legacy value
    return attemptType === 'robbed_hr' ? 'robbed_hr' : attemptType as FieldingPlayTypeValue;
  }
  // Made attempts: direct mapping
  if (attemptType === 'jumping') return 'leaping';
  return attemptType as FieldingPlayTypeValue;
}

// ──────────────────────────────────────────────────────────────
// Existing mapping functions (preserved for downstream consumers)
// ──────────────────────────────────────────────────────────────

export function mapFieldingPlayTypeToPlayDifficulty(
  fieldingPlayType?: FieldingPlayTypeValue,
): 'routine' | 'likely' | 'difficult' | 'impossible' | undefined {
  switch (fieldingPlayType) {
    case 'routine':
      return 'routine';
    case 'charging':
    case 'running':
    case 'beat_runner':
    case 'beat_throw':
      return 'likely';
    case 'diving':
    case 'leaping':
    case 'sliding':
    case 'over_shoulder':
    case 'missed_dive':
    case 'missed_leap':
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
    case 'beat_runner':
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
    case 'beat_runner':
      return 'Beat Runner';
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
