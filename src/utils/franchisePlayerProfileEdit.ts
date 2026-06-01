import { trackFieldChanges, type EditHistoryEntry } from './editHistoryTracker';
import type { FranchiseFarmRecord } from './franchiseFarmStorage';
import {
  type Chemistry,
  type Grade,
  type Personality,
  type PitchType,
  type Player,
  type Position,
  type RosterStatus,
} from './leagueBuilderStorage';

export const FRANCHISE_PROFILE_PRIMARY_POSITIONS: Position[] = [
  'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY',
];
export const FRANCHISE_PROFILE_SECONDARY_POSITIONS: Position[] = [
  'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'IF', 'OF', 'IF/OF', '1B/OF', 'P', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY',
];
export const FRANCHISE_PROFILE_GRADES: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
export const FRANCHISE_PROFILE_PERSONALITIES: Personality[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined', 'Tough', 'Relaxed', 'Egotistical', 'Jolly', 'Timid', 'Droopy'];
export const FRANCHISE_PROFILE_CHEMISTRIES: Chemistry[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'];
export const FRANCHISE_PROFILE_PITCH_TYPES: PitchType[] = ['4F', '2F', 'CB', 'SL', 'CH', 'FK', 'CF', 'SB', 'SC', 'KN'];

const REVEALED_ALLOWED_FIELDS = new Set<string>([
  'firstName',
  'lastName',
  'nickname',
  'age',
  'bats',
  'throws',
  'primaryPosition',
  'secondaryPosition',
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'velocity',
  'junk',
  'accuracy',
  'arsenal',
  'trait1',
  'trait2',
  'personality',
  'chemistry',
  'overallGrade',
]);

const HIDDEN_FARM_ALLOWED_FIELDS = new Set<string>([
  'firstName',
  'lastName',
  'nickname',
  'age',
  'bats',
  'throws',
  'primaryPosition',
  'secondaryPosition',
  'trait1',
  'trait2',
  'personality',
  'chemistry',
]);

const READ_ONLY_FIELDS = new Set<string>([
  'salary',
  'contractYears',
  'leagueAssignments',
  'teamId',
  'rosterStatus',
  'ratingRevealState',
  'ratingRevealedAt',
  'optionsUsedBySeason',
  'optionDatesBySeason',
  'prospectProfile',
  'hiddenPersonalityModifiers',
  'morale',
  'mojo',
  'fame',
  'trueValue',
  'valueDelta',
  'designation',
  'scoutedGrade',
  'potentialGrade',
  'scoutConfidence',
  'trueGrade',
  'hiddenScoutTruth',
  'hiddenRatingFields',
]);

const RATING_FIELDS = new Set<string>([
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'velocity',
  'junk',
  'accuracy',
]);

export interface FranchisePlayerProfileEditPayload {
  firstName?: unknown;
  lastName?: unknown;
  nickname?: unknown;
  age?: unknown;
  bats?: unknown;
  throws?: unknown;
  primaryPosition?: unknown;
  secondaryPosition?: unknown;
  power?: unknown;
  contact?: unknown;
  speed?: unknown;
  fielding?: unknown;
  arm?: unknown;
  velocity?: unknown;
  junk?: unknown;
  accuracy?: unknown;
  arsenal?: unknown;
  trait1?: unknown;
  trait2?: unknown;
  personality?: unknown;
  chemistry?: unknown;
  overallGrade?: unknown;
  [key: string]: unknown;
}

export interface BuildFranchisePlayerProfileEditInput {
  player: Player;
  farmRecord?: FranchiseFarmRecord | null;
  teamId?: string;
  leagueId?: string;
  changes: FranchisePlayerProfileEditPayload;
}

export interface FranchisePlayerProfileEditValidation {
  valid: boolean;
  hiddenFarmLimitedEdit: boolean;
  sanitizedChanges: Partial<Player>;
  errors: string[];
  blockedFields: string[];
}

export interface FranchisePlayerProfileEditResult extends FranchisePlayerProfileEditValidation {
  player: Player;
  editHistoryEntries: EditHistoryEntry[];
}

function resolveAssignment(player: Player, teamId?: string, leagueId?: string) {
  const assignments = player.leagueAssignments ?? [];
  return (
    assignments.find((assignment) =>
      (!teamId || assignment.teamId === teamId) &&
      (!leagueId || assignment.leagueId === leagueId),
    ) ??
    assignments.find((assignment) => !teamId || assignment.teamId === teamId) ??
    assignments[0]
  );
}

function resolveRevealState(
  player: Player,
  rosterStatus: RosterStatus | 'UNKNOWN',
  farmRecord?: FranchiseFarmRecord | null,
): 'hidden' | 'revealed' {
  if (farmRecord?.ratingRevealState === 'revealed') return 'revealed';
  if (farmRecord?.ratingRevealState === 'hidden') return 'hidden';
  if (player.ratingRevealState === 'revealed') return 'revealed';
  if (player.ratingRevealState === 'hidden') return 'hidden';
  return rosterStatus === 'FARM' ? 'hidden' : 'revealed';
}

export function isFranchiseProfileHiddenFarmEdit(
  player: Player,
  farmRecord?: FranchiseFarmRecord | null,
  teamId?: string,
  leagueId?: string,
): boolean {
  const assignment = resolveAssignment(player, teamId, leagueId);
  const rosterStatus = assignment?.rosterStatus ?? 'UNKNOWN';
  return rosterStatus === 'FARM' && resolveRevealState(player, rosterStatus, farmRecord) !== 'revealed';
}

function parseOptionalText(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function parseRequiredText(field: string, value: unknown, errors: string[]): string | undefined {
  const text = parseOptionalText(value);
  if (!text) errors.push(`${field} is required.`);
  return text;
}

function parseIntegerInRange(field: string, value: unknown, min: number, max: number, errors: string[]): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    errors.push(`${field} must be an integer from ${min} to ${max}.`);
    return undefined;
  }
  return numeric;
}

function parseEnumValue<T extends string>(field: string, value: unknown, allowed: readonly T[], errors: string[]): T | undefined {
  if (value == null || value === '') return undefined;
  if (allowed.includes(value as T)) return value as T;
  errors.push(`${field} must be one of: ${allowed.join(', ')}.`);
  return undefined;
}

function parsePitchArsenal(value: unknown, errors: string[]): PitchType[] | undefined {
  if (!Array.isArray(value)) {
    errors.push('arsenal must be a list of pitch types.');
    return undefined;
  }
  const normalized: PitchType[] = [];
  for (const pitch of value) {
    const parsed = parseEnumValue('arsenal', pitch, FRANCHISE_PROFILE_PITCH_TYPES, errors);
    if (!parsed) continue;
    if (!normalized.includes(parsed)) normalized.push(parsed);
  }
  return normalized;
}

function buildManualEditHistory(previous: Player, next: Player, sanitizedChanges: Partial<Player>): EditHistoryEntry[] {
  const tracked = trackFieldChanges(previous as unknown as Record<string, unknown>, sanitizedChanges, 'base');
  const trackedFields = new Set(tracked.map((entry) => entry.field));
  const now = new Date().toISOString();
  const extraFields: Array<keyof Player> = ['firstName', 'lastName', 'overallGrade'];
  const extras: EditHistoryEntry[] = [];

  for (const field of extraFields) {
    if (!(field in sanitizedChanges)) continue;
    if (trackedFields.has(field)) continue;
    if (previous[field] === sanitizedChanges[field]) continue;
    extras.push({
      date: now,
      field,
      oldValue: previous[field],
      newValue: sanitizedChanges[field],
      context: 'base',
    });
  }

  return [...tracked, ...extras];
}

export function validateFranchisePlayerProfileEdit({
  player,
  farmRecord,
  teamId,
  leagueId,
  changes,
}: BuildFranchisePlayerProfileEditInput): FranchisePlayerProfileEditValidation {
  const hiddenFarmLimitedEdit = isFranchiseProfileHiddenFarmEdit(player, farmRecord, teamId, leagueId);
  const allowed = hiddenFarmLimitedEdit ? HIDDEN_FARM_ALLOWED_FIELDS : REVEALED_ALLOWED_FIELDS;
  const sanitizedChanges: Partial<Player> = {};
  const errors: string[] = [];
  const blockedFields: string[] = [];

  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    if (!allowed.has(field)) {
      blockedFields.push(field);
      const reason = READ_ONLY_FIELDS.has(field)
        ? 'read-only in this slice'
        : hiddenFarmLimitedEdit
          ? 'blocked for unrevealed FARM profiles'
          : 'unsupported for Franchise profile manual edit';
      errors.push(`${field} is ${reason}.`);
      continue;
    }

    if (field === 'firstName' || field === 'lastName') {
      const text = parseRequiredText(field, value, errors);
      if (text !== undefined) sanitizedChanges[field] = text;
    } else if (field === 'nickname' || field === 'trait1' || field === 'trait2') {
      sanitizedChanges[field] = parseOptionalText(value);
    } else if (field === 'age') {
      const age = parseIntegerInRange(field, value, 16, 60, errors);
      if (age !== undefined) sanitizedChanges.age = age;
    } else if (field === 'bats') {
      const bats = parseEnumValue(field, value, ['L', 'R', 'S'] as const, errors);
      if (bats) sanitizedChanges.bats = bats;
    } else if (field === 'throws') {
      const throws = parseEnumValue(field, value, ['L', 'R'] as const, errors);
      if (throws) sanitizedChanges.throws = throws;
    } else if (field === 'primaryPosition') {
      const position = parseEnumValue(field, value, FRANCHISE_PROFILE_PRIMARY_POSITIONS, errors);
      if (position) sanitizedChanges.primaryPosition = position;
    } else if (field === 'secondaryPosition') {
      const position = parseEnumValue(field, value, FRANCHISE_PROFILE_SECONDARY_POSITIONS, errors);
      sanitizedChanges.secondaryPosition = position;
    } else if (RATING_FIELDS.has(field)) {
      const rating = parseIntegerInRange(field, value, 0, 99, errors);
      if (rating !== undefined) {
        (sanitizedChanges as Record<string, unknown>)[field] = rating;
      }
    } else if (field === 'arsenal') {
      const arsenal = parsePitchArsenal(value, errors);
      if (arsenal) sanitizedChanges.arsenal = arsenal;
    } else if (field === 'personality') {
      const personality = parseEnumValue(field, value, FRANCHISE_PROFILE_PERSONALITIES, errors);
      if (personality) sanitizedChanges.personality = personality;
    } else if (field === 'chemistry') {
      const chemistry = parseEnumValue(field, value, FRANCHISE_PROFILE_CHEMISTRIES, errors);
      if (chemistry) sanitizedChanges.chemistry = chemistry;
    } else if (field === 'overallGrade') {
      const grade = parseEnumValue(field, value, FRANCHISE_PROFILE_GRADES, errors);
      if (grade) sanitizedChanges.overallGrade = grade;
    }
  }

  return {
    valid: errors.length === 0,
    hiddenFarmLimitedEdit,
    sanitizedChanges,
    errors,
    blockedFields,
  };
}

export function applyFranchisePlayerProfileEdit(input: BuildFranchisePlayerProfileEditInput): FranchisePlayerProfileEditResult {
  const validation = validateFranchisePlayerProfileEdit(input);
  if (!validation.valid) {
    return {
      ...validation,
      player: input.player,
      editHistoryEntries: [],
    };
  }

  const nextPlayer: Player = {
    ...input.player,
    ...validation.sanitizedChanges,
  };
  const editHistoryEntries = buildManualEditHistory(input.player, nextPlayer, validation.sanitizedChanges);

  return {
    ...validation,
    player: {
      ...nextPlayer,
      editHistory: [
        ...(input.player.editHistory ?? []),
        ...editHistoryEntries,
      ],
    },
    editHistoryEntries,
  };
}
