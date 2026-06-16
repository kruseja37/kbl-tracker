import type {
  EditHistoryEntry,
  Grade,
  PitchType,
  Player,
  Position,
  RosterStatus,
} from './leagueBuilderStorage';
import type { FranchiseFarmRecord } from './franchiseFarmStorage';
import type { FranchisePlayerDesignationRecord } from './franchiseDesignations';
import type { HiddenPersonalityModifiers } from './prospectScoutingDraftEngine';
import { getVisibleSafeFranchisePlayerSalary } from './franchiseSalary';
import {
  calculateFranchisePlayerRatingModelGrade,
  playerHasFranchisePitchingModel,
} from './franchisePlayerRatingModel';

type RevealState = 'hidden' | 'revealed';

interface ProspectProfileCarrier {
  prospectProfile?: {
    source?: string;
    methodVersion?: string;
    draftYear?: number;
    draftRound?: number;
    draftPick?: number;
    teamId?: string;
    scoutedGrade?: string;
    potentialGrade?: string;
    scoutId?: string;
    scoutName?: string;
    scoutConfidence?: string;
    scoutSpecialtiesVisible?: string[];
    scoutWeaknessesVisible?: string[];
    trueGrade?: unknown;
    trueRatings?: unknown;
    hiddenScoutTruth?: unknown;
    hiddenRatingFields?: unknown;
    [key: string]: unknown;
  };
  hiddenPersonalityModifiers?: HiddenPersonalityModifiers;
}

export interface BuildFranchisePlayerProfileInput {
  player: Player;
  farmRecord?: FranchiseFarmRecord | null;
  teamId?: string;
  leagueId?: string;
}

export interface FranchisePlayerProfileBaseballIdentity {
  name: string;
  age: number;
  bats: Player['bats'];
  throws: Player['throws'];
  primaryPosition: Position;
  secondaryPosition?: Position;
  traits: string[];
  personality: Player['personality'];
  chemistry: Player['chemistry'];
}

export interface FranchisePlayerProfileFullDetails {
  ratingModelGrade: Grade;
  storedOverallGrade: Grade;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  pitchingModelAvailable: boolean;
  pitchingRatings: FranchisePlayerProfilePitchingDetails | null;
}

export interface FranchisePlayerProfilePitchingDetails {
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: PitchType[];
}

export interface FranchisePlayerProfileProspectReport {
  scoutedGrade?: string;
  potentialGrade?: string;
  scoutConfidence?: string;
  scoutName?: string;
  scoutSpecialtiesVisible: string[];
  scoutWeaknessesVisible: string[];
  source?: string;
  methodVersion?: string;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
}

export interface FranchisePlayerProfileEditHistoryEntry {
  date?: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface FranchisePlayerProfileViewModel {
  playerId: string;
  teamId?: string;
  leagueId?: string;
  rosterStatus: RosterStatus | 'UNKNOWN';
  revealState: RevealState;
  hiddenSafe: boolean;
  identity: FranchisePlayerProfileBaseballIdentity;
  salary: number | null;
  contractYears?: number;
  farm: {
    recordPresent: boolean;
    rosterLevel?: string;
    optionsUsed?: number;
    optionDates: string[];
    assignedAt?: string;
  };
  prospectReport: FranchisePlayerProfileProspectReport;
  fullDetails: FranchisePlayerProfileFullDetails | null;
  activeDesignations: Array<{
    type: FranchisePlayerDesignationRecord['type'];
    status: FranchisePlayerDesignationRecord['status'];
    teamId: string;
    calculatedAt: string;
  }>;
  editHistory: FranchisePlayerProfileEditHistoryEntry[];
  suppressedHiddenFieldLabels: string[];
  limitations: string[];
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim() || player.id;
}

function playerTraits(player: Player): string[] {
  return [player.trait1, player.trait2].filter((trait): trait is string =>
    typeof trait === 'string' && trait.trim().length > 0,
  );
}

function resolveAssignment(
  player: Player,
  teamId?: string,
  leagueId?: string,
) {
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

function resolveRevealState(player: Player, rosterStatus: RosterStatus | 'UNKNOWN', farmRecord?: FranchiseFarmRecord | null): RevealState {
  if (player.ratingRevealState === 'revealed') return 'revealed';
  if (farmRecord?.ratingRevealState === 'revealed') return 'revealed';
  if (player.ratingRevealState === 'hidden') return 'hidden';
  if (farmRecord?.ratingRevealState === 'hidden') return 'hidden';
  return rosterStatus === 'FARM' ? 'hidden' : 'revealed';
}

function buildFullDetails(player: Player): FranchisePlayerProfileFullDetails {
  const pitchingModelAvailable = playerHasFranchisePitchingModel(player);
  return {
    ratingModelGrade: calculateFranchisePlayerRatingModelGrade(player),
    storedOverallGrade: player.overallGrade,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    pitchingModelAvailable,
    pitchingRatings: pitchingModelAvailable
      ? {
          velocity: player.velocity,
          junk: player.junk,
          accuracy: player.accuracy,
          arsenal: [...(player.arsenal ?? [])],
        }
      : null,
  };
}

function collectHiddenSuppressionLabels(player: Player & ProspectProfileCarrier): string[] {
  const labels = [
    'true numeric ratings',
    'true grade',
    'hidden personality modifiers',
    'hidden scout truth',
    'raw hidden rating fields',
  ];

  if (!player.prospectProfile?.trueGrade) {
    return labels.filter((label) => label !== 'true grade');
  }

  return labels;
}

const HIDDEN_SAFE_EDIT_HISTORY_FIELDS = new Set<string>([
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

const SENSITIVE_EDIT_HISTORY_FIELDS = new Set<string>([
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'velocity',
  'junk',
  'accuracy',
  'arsenal',
  'overallGrade',
  'trueGrade',
  'trueRatings',
  'hiddenPersonalityModifiers',
  'hiddenScoutTruth',
  'hiddenRatingFields',
  'prospectProfile',
  'scoutedGrade',
  'potentialGrade',
  'scoutConfidence',
  'salary',
  'contractYears',
  'leagueAssignments',
  'ratingRevealState',
  'ratingRevealedAt',
]);

function formatEditHistoryValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map(formatEditHistoryValue).join(', ');
  if (typeof value === 'object') return '[redacted]';
  return String(value);
}

function buildProfileEditHistory(
  entries: EditHistoryEntry[] | undefined,
  hiddenSafe: boolean,
): FranchisePlayerProfileEditHistoryEntry[] {
  const filtered = (entries ?? []).filter((entry) => {
    if (!hiddenSafe) return true;
    return HIDDEN_SAFE_EDIT_HISTORY_FIELDS.has(entry.field) && !SENSITIVE_EDIT_HISTORY_FIELDS.has(entry.field);
  });

  return filtered
    .slice(-8)
    .reverse()
    .map((entry) => ({
      date: entry.date,
      field: entry.field,
      oldValue: formatEditHistoryValue(entry.oldValue),
      newValue: formatEditHistoryValue(entry.newValue),
    }));
}

function buildActiveDesignations(
  player: Player,
  teamId: string | undefined,
  hiddenSafe: boolean,
): FranchisePlayerProfileViewModel['activeDesignations'] {
  if (hiddenSafe) return [];
  const carrier = player as Player & { franchiseDesignations?: FranchisePlayerDesignationRecord[] };
  return (carrier.franchiseDesignations ?? [])
    .filter((designation) =>
      designation.status === 'active' &&
      (designation.type === 'TEAM_MVP' || designation.type === 'ACE') &&
      (!teamId || designation.teamId === teamId),
    )
    .map((designation) => ({
      type: designation.type,
      status: designation.status,
      teamId: designation.teamId,
      calculatedAt: designation.calculatedAt,
    }));
}

export function buildFranchisePlayerProfileViewModel({
  player,
  farmRecord,
  teamId,
  leagueId,
}: BuildFranchisePlayerProfileInput): FranchisePlayerProfileViewModel {
  const carrier = player as Player & ProspectProfileCarrier;
  const assignment = resolveAssignment(player, teamId, leagueId);
  const rosterStatus = assignment?.rosterStatus ?? 'UNKNOWN';
  const revealState = resolveRevealState(player, rosterStatus, farmRecord);
  const hiddenSafe = rosterStatus === 'FARM' && revealState !== 'revealed';
  const prospectProfile = carrier.prospectProfile ?? {};
  const resolvedTeamId = assignment?.teamId ?? teamId;

  return {
    playerId: player.id,
    teamId: resolvedTeamId,
    leagueId: assignment?.leagueId ?? leagueId,
    rosterStatus,
    revealState,
    hiddenSafe,
    identity: {
      name: playerName(player),
      age: player.age,
      bats: player.bats,
      throws: player.throws,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition,
      traits: playerTraits(player),
      personality: player.personality,
      chemistry: player.chemistry,
    },
    salary: hiddenSafe ? getVisibleSafeFranchisePlayerSalary(player) : (Number.isFinite(Number(player.salary)) ? Number(player.salary) : null),
    contractYears: player.contractYears,
    farm: {
      recordPresent: Boolean(farmRecord),
      rosterLevel: farmRecord?.rosterLevel,
      optionsUsed: farmRecord?.optionsUsed,
      optionDates: [...(farmRecord?.optionDates ?? [])],
      assignedAt: farmRecord?.assignedAt,
    },
    prospectReport: {
      scoutedGrade: prospectProfile.scoutedGrade,
      potentialGrade: prospectProfile.potentialGrade,
      scoutConfidence: prospectProfile.scoutConfidence,
      scoutName: prospectProfile.scoutName,
      scoutSpecialtiesVisible: [...(prospectProfile.scoutSpecialtiesVisible ?? [])],
      scoutWeaknessesVisible: [...(prospectProfile.scoutWeaknessesVisible ?? [])],
      source: prospectProfile.source ?? player.sourceDatabase,
      methodVersion: prospectProfile.methodVersion,
      draftYear: prospectProfile.draftYear,
      draftRound: prospectProfile.draftRound,
      draftPick: prospectProfile.draftPick,
    },
    fullDetails: hiddenSafe ? null : buildFullDetails(player),
    activeDesignations: buildActiveDesignations(player, resolvedTeamId, hiddenSafe),
    editHistory: buildProfileEditHistory(player.editHistory, hiddenSafe),
    suppressedHiddenFieldLabels: hiddenSafe ? collectHiddenSuppressionLabels(carrier) : [],
    limitations: hiddenSafe
      ? ['Unrevealed FARM profile: true ratings and hidden prospect truth stay hidden until call-up/reveal.']
      : [],
  };
}
