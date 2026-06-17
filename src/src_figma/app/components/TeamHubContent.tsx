import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react";
import { Building2, User } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../../hooks/useSeasonStats';
import { useFranchiseDataContext } from "@/app/pages/FranchiseHome";
import {
  getAllFranchisePlayers,
  getFranchisePlayer,
  getFranchiseTeam,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import {
  buildFranchisePlayerProfileViewModel,
  type FranchisePlayerProfileViewModel,
} from "../../../utils/franchisePlayerProfile";
import {
  buildFranchisePlayerContinuity,
  type FranchisePlayerContinuityReport,
} from "../../../utils/franchisePlayerContinuity";
import {
  applyFranchisePlayerProfileEdit,
  FRANCHISE_PROFILE_CHEMISTRIES,
  FRANCHISE_PROFILE_GRADES,
  FRANCHISE_PROFILE_PERSONALITIES,
  FRANCHISE_PROFILE_PITCH_TYPES,
  FRANCHISE_PROFILE_PRIMARY_POSITIONS,
  FRANCHISE_PROFILE_SECONDARY_POSITIONS,
  type FranchisePlayerProfileEditPayload,
} from "../../../utils/franchisePlayerProfileEdit";
import { playerHasFranchisePitchingModel } from "../../../utils/franchisePlayerRatingModel";
import {
  getFranchiseFarmRoster,
  type FranchiseFarmRecord,
} from "../../../utils/franchiseFarmStorage";
import {
  buildFranchisePlayerTeamStatStints,
  type FranchisePlayerTeamStatStint,
} from "../../../utils/franchiseStatAttribution";
import {
  getRecentGames,
  type CompletedGameRecord,
} from "../../../utils/gameStorage";
import {
  getGameEvents,
  getGameFieldingEvents,
  type AtBatEvent,
  type FieldingEvent,
} from "../../../utils/eventLog";
import {
  getAllGamesByFranchise,
  type ScheduledGame,
} from "../../../utils/scheduleStorage";
import { getSeasonIdForScope } from "../../../utils/franchisePersistenceContract";
import {
  buildFranchiseAnalyticsTrustReport,
  type FranchiseAnalyticsTrustReport,
} from "../../../utils/franchiseAnalyticsTrust";
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputReport,
} from "../../../utils/franchiseValueInputs";
import {
  buildFranchiseTrueValuePreviewReport,
  type FranchiseTrueValuePreviewReport,
} from "../../../utils/franchiseTrueValuePreview";
import {
  getFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from "../../../utils/franchiseTrueValueStorage";
import {
  buildFranchiseExpectedWinsPreviewReport,
  type FranchiseExpectedWinsPreviewReport,
} from "../../../utils/franchiseExpectedWinsPreview";
import {
  buildFranchiseDesignationEligibility,
  type FranchiseDesignationEligibilityReport,
} from "../../../utils/franchiseDesignationEligibility";
import {
  buildFranchiseDesignationMoraleContextAdapterReport,
} from "../../../utils/franchiseDesignationMoraleContextAdapter";
import {
  getLiveDesignationBadge,
  getProjectedDesignationBadge,
  type FranchisePlayerDesignationRecord,
} from "../../../utils/franchiseDesignations";
import {
  getFranchiseDesignationRows,
} from "../../../utils/franchiseDesignationStorage";
import {
  buildFranchiseSalaryLifecycle,
  type FranchiseSalaryLifecycleReport,
} from "../../../utils/franchiseSalaryLifecycle";
import {
  getVisibleSafeFranchisePlayerSalary,
  resolveFranchiseSalaryRevealState,
} from "../../../utils/franchiseSalary";
import {
  buildFranchiseMoraleRelationshipTrustReport,
  type FranchiseMoraleRelationshipTrustReport,
} from "../../../utils/franchiseMoraleRelationshipTrust";
import {
  buildFranchiseRelationshipContextPreview,
  type FranchiseRelationshipContextPreviewReport,
} from "../../../utils/franchiseRelationshipContextPreview";
import {
  buildFranchiseNarrativeEventEligibilityReport,
  type FranchiseNarrativeEventEligibilityReport,
} from "../../../utils/franchiseNarrativeEventEligibility";
import {
  buildFranchiseStadiumFoundationReport,
  filterAndSortFranchiseSprayChartRows,
  type FranchiseStadiumFoundationReport,
  type FranchiseSprayChartFilterSortOptions,
  type FranchiseSprayChartRow,
  type FranchiseSprayChartRole,
} from "../../../utils/franchiseStadiumFoundation";
import {
  ZONE_CENTERS,
  ZONE_POLYGONS,
} from "../../../data/fieldZones";
import {
  type FranchiseRandomEventLogReport,
} from "../../../utils/franchiseRandomEventLog";
import {
  buildGeneratedFranchiseRandomEventLogReport,
  type FranchiseRandomEventPlayerEvidence,
} from "../../../utils/franchiseRandomEventGenerator";
import {
  classifyFranchiseRandomEventSafeEffect,
  confirmFranchiseRandomEventLogRecord,
  dismissFranchiseRandomEventLogRecord,
  listFranchiseRandomEventLogRecords,
  syncFranchiseRandomEventLogFromReport,
  type FranchiseRandomEventLogRecord,
  type FranchiseRandomEventSafeEffectTarget,
} from "../../../utils/franchiseRandomEventLogStorage";
import {
  applyFranchiseMoraleEffect,
  listFranchiseMoraleSnapshots,
  type FranchiseMoraleSnapshot,
  type FranchiseMoraleTargetType,
} from "../../../utils/franchiseMoraleState";
import {
  buildFranchiseFanMoraleSpecViewModel,
  type FranchiseFanMoraleSpecViewModel,
} from "../../../utils/franchiseFanMoraleSpecAdapter";
import {
  buildFranchisePlayerMoraleSpecViewModel,
} from "../../../utils/franchisePlayerMoraleSpecAdapter";
import {
  validateFranchiseMoraleRelationshipOverrideProposal,
  type FranchiseMoraleRelationshipOverrideProposal,
  type FranchiseMoraleRelationshipOverrideValidationResult,
} from "../../../utils/franchiseMoraleRelationshipOverrideSchema";
import {
  getTransactionsByFranchiseSeason,
  type Mode2V1TransactionType,
  type TransactionLogEntry,
} from "../../../utils/transactionStorage";
import { analyzeFranchiseTeamRoster } from "../../../utils/rosterAnalyzerFranchiseAdapter";
import type {
  Chemistry,
  Grade,
  LineupSlot,
  Personality,
  Player,
  Position,
  Team,
} from "../../../utils/leagueBuilderStorage";
import type { RosterAnalyzerReport } from "../../../engines/rosterAnalyzerEngine";
import { formatSalary } from "../../../engines/salaryCalculator";
import {
  buildLineupSnapshotFromSlots,
  buildOptimalLineupSnapshot,
  confirmEngineOptimalLineupSnapshot,
  isOfficialOptimalLineupSnapshot,
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
  optimalLineupField,
  optimalLineupFieldsForDh,
  summarizeLineupSnapshotComparison,
  type LineupSnapshotComparison,
  type OptimalLineupCandidate,
  type OptimalLineupSnapshotField,
} from "../../../utils/optimalLineup";
import type {
  OpposingPitcherHand,
  OptimalLineupSnapshot,
} from "../../../types/managerWpa";
import { OptimalLineupComparisonPanel } from "./OptimalLineupComparisonPanel";

type TeamHubTab = "team" | "fan-morale" | "roster" | "directory" | "stats" | "stadium" | "manager";

// Empty fallbacks — populated from real data when available
const EMPTY_TEAMS: string[] = [];
const EMPTY_STADIUMS: string[] = [];

interface RosterTableItem {
  playerId?: string;
  name: string;
  position: string;
  rosterStatus: string;
  teamContext: string;
  grade: string;
  morale: string | number;
  moraleState: string;
  contract: string;
  salarySortValue: number;
  trueValue: string;
  netDiff: string;
  fitness: string | number;
  statSummary: string;
  statSortValue: number;
  designationSummary: string;
  hiddenSafe: boolean;
  originalIndex: number;
}

type RosterSortColumn = 'name' | 'position' | 'rosterStatus' | 'salary' | 'morale' | 'stat' | 'designation';

const EMPTY_ROSTER_DATA: RosterTableItem[] = [];

const EMPTY_STATS_DATA: { name: string; pos: string; war: number; pwar: number; bwar: number; rwar: number; fwar: number; era?: number; ip?: number; k?: number; w?: number; l?: number; sv?: number; avg?: number; hr?: number; rbi?: number; sb?: number; ops?: number }[] = [];
const FRANCHISE_FIELD_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
const FRANCHISE_PITCHER_POSITIONS = new Set<Position>(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);
const FRANCHISE_ROTATION_POSITIONS = new Set<Position>(['SP', 'SP/RP']);
const FRANCHISE_TEAM_HUB_HISTORY_TYPES = new Set<Mode2V1TransactionType>([
  'trade',
  'call_up',
  'send_down',
]);
type FranchiseDirectoryRosterFilter = 'ALL' | 'MLB' | 'FARM' | 'FREE_AGENT' | 'UNASSIGNED';
type FranchiseDirectoryRevealFilter = 'ALL' | 'HIDDEN' | 'REVEALED';
type FranchiseDirectorySort = 'name' | 'team' | 'rosterStatus' | 'position' | 'grade';

interface FranchiseDirectoryRow {
  player: Player;
  playerId: string;
  name: string;
  teamId?: string;
  teamName: string;
  rosterStatus: string;
  primaryPosition: string;
  positionLabel: string;
  revealState: 'hidden' | 'revealed';
  hiddenSafe: boolean;
  gradeLabel: string;
  gradeSortValue: number;
}

interface FranchiseProfileEditForm {
  firstName: string;
  lastName: string;
  nickname: string;
  age: string;
  bats: Player['bats'];
  throws: Player['throws'];
  primaryPosition: Position;
  secondaryPosition: Position | '';
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  arsenal: string;
  trait1: string;
  trait2: string;
  personality: Personality;
  chemistry: Chemistry;
  overallGrade: Grade;
}

// Helper to convert OffseasonPlayer to roster format
function convertToRosterItem(player: OffseasonPlayer): RosterTableItem {
  const salary = player.salary || 0;
  const contractStr = salary > 0 ? formatSalary(salary) : '—';

  return {
    name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
    position: player.position,
    rosterStatus: 'MLB',
    teamContext: player.teamId ?? '',
    grade: player.grade,
    morale: '—' as string | number,
    moraleState: '—',
    contract: contractStr,
    salarySortValue: salary,
    trueValue: '—',
    netDiff: '—',
    fitness: '—' as string | number,
    statSummary: '—',
    statSortValue: Number.NEGATIVE_INFINITY,
    designationSummary: '—',
    hiddenSafe: false,
    originalIndex: 0,
  };
}

// Helper to convert OffseasonPlayer to stats format (empty — no season data yet)
function convertToStatsItem(player: OffseasonPlayer) {
  const shortName = player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' ');
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.position);

  if (isPitcher) {
    return {
      name: shortName,
      pos: player.position,
      war: 0.0,
      pwar: 0.0,
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      era: undefined as number | undefined,
      ip: undefined as number | undefined,
      k: undefined as number | undefined,
      w: undefined as number | undefined,
      l: undefined as number | undefined,
    };
  } else {
    return {
      name: shortName,
      pos: player.position,
      war: 0.0,
      pwar: 0.0,
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      avg: undefined as number | undefined,
      hr: undefined as number | undefined,
      rbi: undefined as number | undefined,
      sb: undefined as number | undefined,
      ops: undefined as number | undefined,
    };
  }
}

// Helper to convert OffseasonPlayer + real season stats to stats format
function convertToStatsItemFromSeason(
  player: OffseasonPlayer,
  batting: BattingLeaderEntry | undefined,
  pitching: PitchingLeaderEntry | undefined,
) {
  const shortName = player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' ');
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.position);

  if (isPitcher && pitching) {
    return {
      name: shortName,
      pos: player.position,
      war: parseFloat(pitching.pWAR.toFixed(1)),
      pwar: parseFloat(pitching.pWAR.toFixed(1)),
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      era: parseFloat(pitching.era.toFixed(2)),
      ip: parseFloat(pitching.ip),
      k: pitching.strikeouts,
      w: pitching.wins,
      l: pitching.losses,
    };
  } else if (!isPitcher && batting) {
    return {
      name: shortName,
      pos: player.position,
      war: parseFloat(batting.totalWAR.toFixed(1)),
      pwar: 0.0,
      bwar: parseFloat(batting.bWAR.toFixed(1)),
      rwar: parseFloat(batting.rWAR.toFixed(1)),
      fwar: parseFloat(batting.fWAR.toFixed(1)),
      avg: parseFloat(batting.avg.toFixed(3)),
      hr: batting.homeRuns,
      rbi: batting.rbi,
      sb: batting.stolenBases,
      ops: parseFloat(batting.ops.toFixed(3)),
    };
  }

  // Fallback: player exists in roster but has no matching season stats
  return convertToStatsItem(player);
}

function getFranchisePlayerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function franchisePlayerDirectoryAssignment(player: Player, leagueId?: string) {
  const assignments = player.leagueAssignments ?? [];
  return (
    assignments.find((assignment) => leagueId && assignment.leagueId === leagueId && String(assignment.rosterStatus) !== 'RELEASED') ??
    assignments.find((assignment) => String(assignment.rosterStatus) !== 'RELEASED') ??
    assignments[0]
  );
}

function franchiseDirectoryRevealState(player: Player, rosterStatus: string): 'hidden' | 'revealed' {
  return resolveFranchiseSalaryRevealState(player, rosterStatus);
}

function buildRandomEventPlayerEvidence(
  player: Player,
  input: {
    franchiseId: string;
    seasonId: string;
    statsScopeId: string;
    seasonNumber: number;
    leagueId?: string;
    farmRecordByPlayerId: Map<string, FranchiseFarmRecord>;
  },
): FranchiseRandomEventPlayerEvidence {
  const assignment = franchisePlayerDirectoryAssignment(player, input.leagueId);
  const rosterStatus = String(assignment?.rosterStatus ?? '');
  const farmRecord = input.farmRecordByPlayerId.get(player.id);
  return {
    ...player,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    ratingRevealState: resolveFranchiseSalaryRevealState(
      {
        ...player,
        ratingRevealState: player.ratingRevealState === 'revealed'
          ? 'revealed'
          : farmRecord?.ratingRevealState ?? player.ratingRevealState,
      },
      rosterStatus,
    ),
  };
}

function randomEventSafeEffectTarget(
  record: FranchiseRandomEventLogRecord,
  fallbackTeamId?: string,
): FranchiseRandomEventSafeEffectTarget {
  const playerReference = record.entry.evidenceReferences.find((reference) =>
    reference.targetType === 'player' || Boolean(reference.playerId),
  );
  if (record.kind !== 'score-only-context' && (playerReference?.targetType === 'player' || playerReference?.targetPlayerRevealState)) {
    return {
      targetPlayerId: playerReference.playerId ?? playerReference.targetId,
      targetPlayerRevealState: playerReference.targetPlayerRevealState,
      targetPlayerCurrent: playerReference.targetPlayerCurrent,
    };
  }
  const teamReference = record.entry.evidenceReferences.find((reference) =>
    reference.targetType === 'team-fan' || Boolean(reference.teamId),
  );
  return {
    targetTeamId: teamReference?.teamId ?? (teamReference?.targetType === 'team-fan' ? teamReference.targetId : undefined) ?? fallbackTeamId,
  };
}

function randomEventSourceLabel(record: FranchiseRandomEventLogRecord): string {
  switch (record.kind) {
    case 'gametracker-archive-fact':
      return 'GameTracker archive';
    case 'score-only-context':
      return 'Score-only schedule; confirm team-fan morale only';
    case 'roster-movement-context':
      return 'Roster movement';
    case 'player-profile-edit-context':
      return 'Player profile edit';
    case 'stadium-spray-context':
      return 'Stadium spray';
    default:
      return 'Scoped evidence';
  }
}

function randomEventFollowUpLabel(effectPreview: ReturnType<typeof classifyFranchiseRandomEventSafeEffect>): string {
  if (!effectPreview.allowed) return 'Manual smoke: confirm is expected to record context only or skip the safe effect.';
  if (effectPreview.targetType === 'player') return 'Manual smoke: after confirm, open the player profile and check Player Morale History.';
  if (effectPreview.targetType === 'team-fan') return 'Manual smoke: after confirm, open Fan Morale and check Event-Backed History.';
  return 'Manual smoke: after confirm, verify no blocked systems changed.';
}

const FRANCHISE_GRADE_ORDER = new Map<string, number>([
  ['S', 12],
  ['A+', 11],
  ['A', 10],
  ['A-', 9],
  ['B+', 8],
  ['B', 7],
  ['B-', 6],
  ['C+', 5],
  ['C', 4],
  ['C-', 3],
  ['D+', 2],
  ['D', 1],
  ['D-', 0],
]);

function franchiseGradeSortValue(grade?: string): number {
  return FRANCHISE_GRADE_ORDER.get(String(grade ?? '').toUpperCase()) ?? -1;
}

function franchiseDirectoryGrade(player: Player, hiddenSafe: boolean): { label: string; sortValue: number } {
  if (hiddenSafe) {
    const metadata = prospectMetadata(player);
    const scouted = metadata.scoutedGrade ?? 'Unscouted';
    const potential = metadata.potentialGrade ? ` / Pot ${metadata.potentialGrade}` : '';
    return {
      label: `Scouted ${scouted}${potential}`,
      sortValue: franchiseGradeSortValue(metadata.scoutedGrade),
    };
  }

  return {
    label: String(player.overallGrade ?? '—'),
    sortValue: franchiseGradeSortValue(String(player.overallGrade ?? '')),
  };
}

function buildFranchiseDirectoryRow(
  player: Player,
  teamNameMap: Record<string, string>,
  leagueId?: string,
): FranchiseDirectoryRow {
  const assignment = franchisePlayerDirectoryAssignment(player, leagueId);
  const teamId = assignment?.teamId;
  const rosterStatus = String(assignment?.rosterStatus ?? 'UNASSIGNED');
  const revealState = franchiseDirectoryRevealState(player, rosterStatus);
  const hiddenSafe = rosterStatus === 'FARM' && revealState !== 'revealed';
  const grade = franchiseDirectoryGrade(player, hiddenSafe);
  const primaryPosition = String(player.primaryPosition ?? 'UNKNOWN');

  return {
    player,
    playerId: player.id,
    name: getFranchisePlayerName(player) || player.id,
    teamId,
    teamName: teamId ? teamNameMap[teamId] ?? teamId : 'Unassigned',
    rosterStatus,
    primaryPosition,
    positionLabel: player.secondaryPosition ? `${primaryPosition} / ${player.secondaryPosition}` : primaryPosition,
    revealState,
    hiddenSafe,
    gradeLabel: grade.label,
    gradeSortValue: grade.sortValue,
  };
}

function franchiseDirectoryPositionMatches(row: FranchiseDirectoryRow, filter: string): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PITCHERS') return FRANCHISE_PITCHER_POSITIONS.has(row.player.primaryPosition);
  if (filter === 'FIELDERS') return !FRANCHISE_PITCHER_POSITIONS.has(row.player.primaryPosition);
  return row.primaryPosition === filter;
}

function formatFranchiseShortName(player: Player): string {
  return [player.firstName, player.lastName]
    .filter(Boolean)
    .map((part, index) => index === 0 ? `${part[0]}.` : part)
    .join(' ') || player.id;
}

function isActiveFranchisePlayerForTeam(player: Player, teamId: string, leagueId?: string): boolean {
  return player.leagueAssignments?.some((assignment) =>
    assignment.teamId === teamId &&
    (!leagueId || assignment.leagueId === leagueId) &&
    (assignment.rosterStatus === 'MLB' || assignment.rosterStatus == null),
  ) ?? false;
}

function isFarmFranchisePlayerForTeam(player: Player, teamId: string, leagueId?: string): boolean {
  return player.leagueAssignments?.some((assignment) =>
    assignment.teamId === teamId &&
    (!leagueId || assignment.leagueId === leagueId) &&
    assignment.rosterStatus === 'FARM',
  ) ?? false;
}

interface ProspectMetadata {
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
  scoutConfidence?: 'low' | 'medium' | 'high' | string;
  scoutSpecialtiesVisible?: string[];
  scoutWeaknessesVisible?: string[];
}

function prospectMetadata(player: Player): ProspectMetadata {
  const carrier = player as Player & { prospectProfile?: ProspectMetadata };
  return carrier.prospectProfile ?? {};
}

function formatFarmSalary(player: Player): string {
  const salary = getVisibleSafeFranchisePlayerSalary(player) ?? 0;
  if (salary <= 0) return '—';
  return formatSalary(salary);
}

function formatFarmOptionDates(optionDates: string[]): string {
  if (optionDates.length === 0) return 'None';
  return optionDates.map((date) => date.slice(0, 10)).join(', ');
}

function formatTeamHubTransactionTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString();
}

function transactionDataString(entry: TransactionLogEntry, key: string): string | undefined {
  const value = entry.data?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function transactionDataStrings(entry: TransactionLogEntry, key: string): string[] {
  const value = entry.data?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function transactionDataObjects(entry: TransactionLogEntry, key: string): Record<string, unknown>[] {
  const value = entry.data?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    : [];
}

function formatTeamHubTransactionType(type: TransactionLogEntry['type']): string {
  return String(type).replaceAll('_', ' ').toUpperCase();
}

function describeTeamHubTransactionPlayers(entry: TransactionLogEntry): string {
  if (entry.type === 'trade') {
    const movedPlayers = [
      ...transactionDataObjects(entry, 'sourcePlayers'),
      ...transactionDataObjects(entry, 'targetPlayers'),
    ].map((row) => {
      const playerId = typeof row.playerId === 'string' ? row.playerId : '';
      const playerName = typeof row.playerName === 'string' && row.playerName.trim().length > 0
        ? row.playerName
        : playerId;
      const rosterStatus = typeof row.rosterStatus === 'string' ? row.rosterStatus : 'UNKNOWN';
      const previousTeamId = typeof row.previousTeamId === 'string'
        ? row.previousTeamId
        : transactionDataString(entry, 'sourceTeamId');
      const newTeamId = typeof row.newTeamId === 'string'
        ? row.newTeamId
        : transactionDataString(entry, 'targetTeamId');
      const movement = previousTeamId || newTeamId
        ? ` ${previousTeamId ?? 'UNKNOWN'} -> ${newTeamId ?? 'UNKNOWN'}`
        : '';
      return `${playerName || playerId} (${playerId || 'unknown-player'}, ${rosterStatus})${movement}`;
    });
    if (movedPlayers.length > 0) return movedPlayers.join(' / ');
  }

  const playerName = transactionDataString(entry, 'playerName');
  const playerId = transactionDataString(entry, 'playerId');
  const playerIds = transactionDataStrings(entry, 'playerIds');
  if (playerName && playerId) return `${playerName} (${playerId})`;
  if (playerId) return playerId;
  return playerIds.join(', ') || 'No player ids recorded';
}

function describeTeamHubTransactionTeams(entry: TransactionLogEntry): string {
  const sourceTeamId = transactionDataString(entry, 'sourceTeamId') ?? transactionDataString(entry, 'oldTeam');
  const targetTeamId = transactionDataString(entry, 'targetTeamId') ?? transactionDataString(entry, 'newTeam');
  if (sourceTeamId || targetTeamId) return `${sourceTeamId ?? 'UNKNOWN'} -> ${targetTeamId ?? 'UNKNOWN'}`;
  return transactionDataString(entry, 'teamId') ?? 'UNKNOWN';
}

function describeTeamHubTransactionStatuses(entry: TransactionLogEntry): string {
  if (entry.type === 'trade') {
    const movedFarm = transactionDataStrings(entry, 'movedFarmPlayerIds');
    return movedFarm.length > 0
      ? `Mixed MLB/FARM trade; farm moved: ${movedFarm.join(', ')}`
      : 'Player ids retained across teams';
  }

  const source = transactionDataString(entry, 'sourceRosterStatus');
  const target = transactionDataString(entry, 'targetRosterStatus');
  if (source || target) return `${source ?? 'UNKNOWN'} -> ${target ?? 'UNKNOWN'}`;
  return 'Status not recorded';
}

function franchisePlayerRosterStatus(player: Player, leagueId?: string): string {
  return String(franchisePlayerDirectoryAssignment(player, leagueId)?.rosterStatus ?? 'UNASSIGNED');
}

function formatRosterSalary(salary: number | null | undefined): string {
  const value = Number(salary);
  if (!Number.isFinite(value) || value <= 0) return '—';
  return formatSalary(value);
}

function moraleStateLabel(value: number): string {
  if (value >= 70) return 'High';
  if (value <= 35) return 'Low';
  return 'Neutral';
}

function rosterStatSummary(input: {
  player: Player;
  batting?: BattingLeaderEntry;
  pitching?: PitchingLeaderEntry;
  hiddenSafe: boolean;
}): { label: string; sortValue: number } {
  if (input.hiddenSafe) return { label: 'Hidden', sortValue: Number.NEGATIVE_INFINITY };
  if (isFranchisePitcher(input.player)) {
    const pitching = input.pitching;
    if (!pitching) return { label: 'No stats', sortValue: Number.NEGATIVE_INFINITY };
    return {
      label: `${pitching.pWAR.toFixed(1)} pWAR · ${pitching.era.toFixed(2)} ERA`,
      sortValue: pitching.pWAR,
    };
  }
  const batting = input.batting;
  if (!batting) return { label: 'No stats', sortValue: Number.NEGATIVE_INFINITY };
  return {
    label: `${batting.totalWAR.toFixed(1)} WAR · ${batting.homeRuns} HR · ${batting.rbi} RBI`,
    sortValue: batting.totalWAR,
  };
}

function rosterDesignationSummary(input: {
  playerId: string;
  hiddenSafe: boolean;
  projectedDesignationRows: FranchisePlayerDesignationRecord[];
}): string {
  if (input.hiddenSafe) return 'Hidden';
  const active = uniqueStrings(
    input.projectedDesignationRows
      .filter((record) => record.playerId === input.playerId && record.status === 'active')
      .map((record) => (getLiveDesignationBadge(record.type) ?? getProjectedDesignationBadge(record.type)).label),
  );
  const projected = uniqueStrings(
    input.projectedDesignationRows
      .filter((record) => record.playerId === input.playerId && record.status === 'projected')
      .map((record) => getProjectedDesignationBadge(record.type).label),
  );
  const parts = [
    active.length > 0 ? `${active.join(', ')} live` : null,
    projected.length > 0 ? `${projected.join(', ')} projected` : null,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join('; ');
  return '—';
}

function convertFranchisePlayerToRosterItem(input: {
  player: Player;
  leagueId?: string;
  teamName?: string;
  moraleSnapshot?: FranchiseMoraleSnapshot;
  batting?: BattingLeaderEntry;
  pitching?: PitchingLeaderEntry;
  projectedDesignationRows: FranchisePlayerDesignationRecord[];
  farmRecordByPlayerId: Map<string, FranchiseFarmRecord>;
  originalIndex: number;
}): RosterTableItem {
  const { player } = input;
  const rosterStatus = franchisePlayerRosterStatus(player, input.leagueId);
  const farmRevealState = input.farmRecordByPlayerId.get(player.id)?.ratingRevealState;
  const revealState = resolveFranchiseSalaryRevealState(
    {
      ...player,
      ratingRevealState: player.ratingRevealState === 'revealed'
        ? 'revealed'
        : farmRevealState ?? player.ratingRevealState,
    },
    rosterStatus,
  );
  const hiddenSafe = rosterStatus === 'FARM' && revealState !== 'revealed';
  const salary = hiddenSafe ? getVisibleSafeFranchisePlayerSalary(player) : Number(player.salary);
  const salaryAvailable = salary !== null && Number.isFinite(salary);
  const moraleValue = input.moraleSnapshot?.currentValue ?? 50;
  const stats = rosterStatSummary({
    player,
    batting: input.batting,
    pitching: input.pitching,
    hiddenSafe,
  });

  return {
    playerId: player.id,
    name: getFranchisePlayerName(player),
    position: player.primaryPosition,
    rosterStatus,
    teamContext: input.teamName ?? input.leagueId ?? '',
    grade: hiddenSafe ? 'Hidden' : player.overallGrade,
    morale: moraleValue,
    moraleState: moraleStateLabel(moraleValue),
    contract: formatRosterSalary(salaryAvailable ? salary : null),
    salarySortValue: salaryAvailable && salary > 0 ? salary : Number.NEGATIVE_INFINITY,
    trueValue: '—',
    netDiff: '—',
    fitness: '—' as string | number,
    statSummary: stats.label,
    statSortValue: stats.sortValue,
    designationSummary: rosterDesignationSummary({
      playerId: player.id,
      hiddenSafe,
      projectedDesignationRows: input.projectedDesignationRows,
    }),
    hiddenSafe,
    originalIndex: input.originalIndex,
  };
}

function convertFranchisePlayerToOffseasonShape(player: Player): OffseasonPlayer {
  return {
    id: player.id,
    name: getFranchisePlayerName(player),
    teamId: player.leagueAssignments?.find((assignment) => assignment.rosterStatus !== 'FREE_AGENT')?.teamId ?? '',
    position: player.primaryPosition,
    age: player.age,
    grade: player.overallGrade,
    salary: player.salary,
  } as OffseasonPlayer;
}

function convertFranchisePlayerToStatsItem(
  player: Player,
  batting: BattingLeaderEntry | undefined,
  pitching: PitchingLeaderEntry | undefined,
) {
  return convertToStatsItemFromSeason(convertFranchisePlayerToOffseasonShape(player), batting, pitching);
}

function buildProfileEditForm(player: Player): FranchiseProfileEditForm {
  return {
    firstName: player.firstName ?? '',
    lastName: player.lastName ?? '',
    nickname: player.nickname ?? '',
    age: String(player.age ?? 25),
    bats: player.bats,
    throws: player.throws,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? '',
    power: String(player.power ?? 0),
    contact: String(player.contact ?? 0),
    speed: String(player.speed ?? 0),
    fielding: String(player.fielding ?? 0),
    arm: String(player.arm ?? 0),
    velocity: String(player.velocity ?? 0),
    junk: String(player.junk ?? 0),
    accuracy: String(player.accuracy ?? 0),
    arsenal: (player.arsenal ?? []).join(', '),
    trait1: player.trait1 ?? '',
    trait2: player.trait2 ?? '',
    personality: player.personality,
    chemistry: player.chemistry,
    overallGrade: player.overallGrade,
  };
}

function profileEditFormToPayload(
  form: FranchiseProfileEditForm,
  baseForm?: FranchiseProfileEditForm | null,
): FranchisePlayerProfileEditPayload {
  const rawPayload: Record<keyof FranchiseProfileEditForm, unknown> = {
    firstName: form.firstName,
    lastName: form.lastName,
    nickname: form.nickname,
    age: form.age,
    bats: form.bats,
    throws: form.throws,
    primaryPosition: form.primaryPosition,
    secondaryPosition: form.secondaryPosition,
    power: form.power,
    contact: form.contact,
    speed: form.speed,
    fielding: form.fielding,
    arm: form.arm,
    velocity: form.velocity,
    junk: form.junk,
    accuracy: form.accuracy,
    arsenal: form.arsenal
      .split(',')
      .map((pitch) => pitch.trim())
      .filter(Boolean),
    trait1: form.trait1,
    trait2: form.trait2,
    personality: form.personality,
    chemistry: form.chemistry,
    overallGrade: form.overallGrade,
  };

  const payload: FranchisePlayerProfileEditPayload = {};
  for (const field of Object.keys(rawPayload) as Array<keyof FranchiseProfileEditForm>) {
    if (baseForm && form[field] === baseForm[field]) continue;
    payload[field] = rawPayload[field];
  }
  return payload;
}

function toOptimalCandidate(player: Player): OptimalLineupCandidate {
  return {
    playerId: player.id,
    playerName: getFranchisePlayerName(player),
    bats: player.bats,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: player.arsenal,
    armSlot: player.armSlot,
    mojo: player.mojo,
    trait1: player.trait1,
    trait2: player.trait2,
    unavailable: false,
  };
}

function buildOptimalPlayerStates(players: Player[]) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        mojo: toEffectiveMojo(player.mojo),
        fitness: "FIT" as const,
      },
    ]),
  );
}

function toEffectiveMojo(mojo: Player["mojo"]) {
  if (mojo === "On Fire") return "On Fire" as const;
  if (mojo === "Hot") return "Locked In" as const;
  if (mojo === "Cold") return "Tense" as const;
  if (mojo === "Ice Cold") return "Rattled" as const;
  return "Normal" as const;
}

function lineupSlotsFromOptimalSnapshot(snapshot: OptimalLineupSnapshot): LineupSlot[] {
  return snapshot.slots
    .slice()
    .sort((left, right) => left.battingOrderSlot - right.battingOrderSlot)
    .map((slot) => ({
      battingOrder: slot.battingOrderSlot,
      playerId: slot.playerId,
      fieldingPosition: slot.defensivePosition as Position,
    }));
}

function buildDefaultFranchiseLineupSlots(players: Player[], useDH: boolean): LineupSlot[] {
  const positionPlayers = players.filter((player) => !FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
  const assigned = new Set<string>();
  const slots: LineupSlot[] = [];

  for (const position of FRANCHISE_FIELD_POSITIONS) {
    const player =
      positionPlayers.find((candidate) => !assigned.has(candidate.id) && candidate.primaryPosition === position) ??
      positionPlayers.find((candidate) => !assigned.has(candidate.id) && candidate.secondaryPosition === position) ??
      positionPlayers.find((candidate) => !assigned.has(candidate.id));
    if (!player) continue;
    assigned.add(player.id);
    slots.push({
      battingOrder: slots.length + 1,
      playerId: player.id,
      fieldingPosition: position,
    });
  }

  if (useDH) {
    const dhPlayer = positionPlayers.find((candidate) => !assigned.has(candidate.id));
    if (dhPlayer) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: dhPlayer.id,
        fieldingPosition: 'DH',
      });
    }
  }

  return slots;
}

function normalizeFranchiseLineupSlots(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  useDH: boolean,
): LineupSlot[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const positionPlayers = players.filter((player) => !FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
  const assigned = new Set<string>();
  const slots: LineupSlot[] = [];
  const targetNonPitchers = useDH ? 9 : 8;

  for (const slot of [...(storedLineup ?? [])].sort((left, right) => left.battingOrder - right.battingOrder)) {
    if (slots.length === targetNonPitchers) break;
    const player = playerById.get(slot.playerId);
    if (!player || assigned.has(player.id)) continue;
    if (FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition)) continue;
    if (!useDH && slot.fieldingPosition === 'DH') continue;
    assigned.add(player.id);
    slots.push({
      battingOrder: slots.length + 1,
      playerId: player.id,
      fieldingPosition: slot.fieldingPosition,
    });
  }

  const fallbackSlots = buildDefaultFranchiseLineupSlots(players, useDH);
  for (const slot of fallbackSlots) {
    if (slots.length === targetNonPitchers) break;
    if (assigned.has(slot.playerId)) continue;
    assigned.add(slot.playerId);
    slots.push({
      ...slot,
      battingOrder: slots.length + 1,
    });
  }

  if (!useDH && slots.length < 9) {
    const starter =
      players.find((player) => FRANCHISE_ROTATION_POSITIONS.has(player.primaryPosition)) ??
      players.find((player) => FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
    if (starter) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: starter.id,
        fieldingPosition: 'P',
      });
    }
  }

  return slots.slice(0, 9).map((slot, index) => ({
    ...slot,
    battingOrder: index + 1,
  }));
}

function isFranchisePitcher(player: Player): boolean {
  return FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition);
}

function getManualLineupTargetCount(players: Player[], useDH: boolean): number {
  const positionPlayerCount = players.filter((player) => !isFranchisePitcher(player)).length;
  return Math.min(useDH ? 9 : 8, positionPlayerCount);
}

function buildEditableFranchiseLineupSlots(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  useDH: boolean,
): LineupSlot[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const targetCount = getManualLineupTargetCount(players, useDH);
  return normalizeFranchiseLineupSlots(players, storedLineup, useDH)
    .filter((slot) => {
      const player = playerById.get(slot.playerId);
      return Boolean(player && !isFranchisePitcher(player));
    })
    .slice(0, targetCount)
    .map((slot, index) => ({
      ...slot,
      battingOrder: index + 1,
      fieldingPosition: !useDH && slot.fieldingPosition === 'DH' ? players.find((player) => player.id === slot.playerId)?.primaryPosition ?? 'LF' : slot.fieldingPosition,
    }));
}

function getFranchiseRotationCandidates(players: Player[]): Player[] {
  const rotationEligible = players.filter((player) => FRANCHISE_ROTATION_POSITIONS.has(player.primaryPosition));
  return rotationEligible.length > 0
    ? rotationEligible
    : players.filter((player) => isFranchisePitcher(player));
}

function normalizeFranchiseRotationIds(players: Player[], storedRotation: string[] | undefined): string[] {
  const candidates = getFranchiseRotationCandidates(players);
  const candidateIds = new Set(candidates.map((player) => player.id));
  const assigned = new Set<string>();
  const normalized: string[] = [];

  for (const playerId of storedRotation ?? []) {
    if (!candidateIds.has(playerId) || assigned.has(playerId)) continue;
    assigned.add(playerId);
    normalized.push(playerId);
  }

  for (const player of candidates) {
    if (assigned.has(player.id)) continue;
    assigned.add(player.id);
    normalized.push(player.id);
  }

  return normalized;
}

function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return Array.from(duplicates);
}

function expectedManualLineupPositions(useDH: boolean): Position[] {
  return useDH ? [...FRANCHISE_FIELD_POSITIONS, 'DH'] : FRANCHISE_FIELD_POSITIONS;
}

function describeStoredLineupRotationWarnings(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  storedRotation: string[] | undefined,
  useDH: boolean,
): string[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const rotationCandidateIds = new Set(getFranchiseRotationCandidates(players).map((player) => player.id));
  const warnings: string[] = [];
  const staleLineupIds = (storedLineup ?? [])
    .filter((slot) => {
      const playerId = slot.playerId;
      const player = playerById.get(playerId);
      if (!player) return true;
      if (isFranchisePitcher(player)) return useDH || slot?.fieldingPosition !== 'P';
      if (!useDH && slot?.fieldingPosition === 'DH') return true;
      return false;
    })
    .map((slot) => slot.playerId);
  const duplicateLineupIds = duplicateIds((storedLineup ?? []).map((slot) => slot.playerId));
  const staleRotationIds = (storedRotation ?? []).filter((playerId) => !rotationCandidateIds.has(playerId));
  const duplicateRotationIds = duplicateIds(storedRotation ?? []);

  if (staleLineupIds.length > 0) {
    warnings.push(`Saved lineup includes non-current MLB players: ${Array.from(new Set(staleLineupIds)).join(', ')}.`);
  }
  if (duplicateLineupIds.length > 0) {
    warnings.push(`Saved lineup includes duplicate players: ${duplicateLineupIds.join(', ')}.`);
  }
  if (staleRotationIds.length > 0) {
    warnings.push(`Saved rotation includes non-current MLB pitchers: ${Array.from(new Set(staleRotationIds)).join(', ')}.`);
  }
  if (duplicateRotationIds.length > 0) {
    warnings.push(`Saved rotation includes duplicate pitchers: ${duplicateRotationIds.join(', ')}.`);
  }

  return warnings;
}

function buildManualLineupForSave(
  players: Player[],
  editableSlots: LineupSlot[],
  rotationIds: string[],
  useDH: boolean,
): LineupSlot[] {
  const activePlayerIds = new Set(players.map((player) => player.id));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const targetCount = getManualLineupTargetCount(players, useDH);
  const slots: LineupSlot[] = editableSlots
    .filter((slot) => activePlayerIds.has(slot.playerId))
    .filter((slot) => {
      const player = playerById.get(slot.playerId);
      return Boolean(player && !isFranchisePitcher(player));
    })
    .slice(0, targetCount)
    .map((slot, index) => ({
      ...slot,
      battingOrder: index + 1,
      fieldingPosition: !useDH && slot.fieldingPosition === 'DH' ? playerById.get(slot.playerId)?.primaryPosition ?? 'LF' : slot.fieldingPosition,
    }));

  if (!useDH) {
    const rotationCandidates = getFranchiseRotationCandidates(players);
    const starterId =
      rotationIds.find((playerId) => rotationCandidates.some((candidate) => candidate.id === playerId)) ??
      rotationCandidates[0]?.id;
    if (starterId) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: starterId,
        fieldingPosition: 'P',
      });
    }
  }

  return slots.slice(0, 9).map((slot, index) => ({
    ...slot,
    battingOrder: index + 1,
  }));
}

function getFreshOptimalLineupFields(update: Partial<Team>): OptimalLineupSnapshotField[] {
  return OPTIMAL_LINEUP_SNAPSHOT_FIELDS.filter((field) => field in update);
}

export function applyFranchiseTeamUpdateWithStaleOptimalSnapshots(
  team: Team,
  update: Partial<Team>,
): Team {
  const staleFields = new Set<OptimalLineupSnapshotField>();
  const preserveFields = getFreshOptimalLineupFields(update);

  if ('lineupWithDH' in update) {
    for (const field of optimalLineupFieldsForDh(true)) staleFields.add(field);
  }

  if ('lineupWithoutDH' in update) {
    for (const field of optimalLineupFieldsForDh(false)) staleFields.add(field);
  }

  if ('startingRotation' in update) {
    for (const field of optimalLineupFieldsForDh(false)) staleFields.add(field);
  }

  return markOptimalLineupSnapshotsStaleForChange(
    { ...team, ...update },
    Array.from(staleFields),
    preserveFields,
  );
}

export function TeamHubContent() {
  // Get real data from hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();
  const franchiseData = useFranchiseDataContext();

  // Derive correct seasonId for stats lookup (must match what GameTracker uses when aggregating)
  const franchiseId = franchiseData.franchiseConfig?.franchiseId;
  const seasonNumber = franchiseData.seasonNumber || 1;
  const seasonId = getSeasonIdForScope(franchiseId, seasonNumber);
  const seasonStats = useSeasonStats(seasonId);

  // Build team → W-L record lookup from real standings (case-insensitive)
  const teamRecordMap = useMemo(() => {
    const map = new Map<string, string>();
    const standings = franchiseData.standings;
    if (!standings) return map;
    for (const conference of Object.values(standings)) {
      if (!conference || typeof conference !== 'object') continue;
      for (const division of Object.values(conference as Record<string, unknown>)) {
        if (!Array.isArray(division)) continue;
        for (const entry of division) {
          if (entry && entry.team) {
            map.set(entry.team.toLowerCase(), `${entry.wins ?? 0}-${entry.losses ?? 0}`);
          }
        }
      }
    }
    return map;
  }, [franchiseData.standings]);

  const getTeamRecord = (teamName: string): string => {
    return teamRecordMap.get(teamName.toLowerCase()) || '0-0';
  };

  const [activeHubTab, setActiveHubTab] = useState<TeamHubTab>("team");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedStadium, setSelectedStadium] = useState<string>("");
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<string>("J. Rodriguez");
  const [statsView, setStatsView] = useState<"table" | "spraychart">("table");
  const [rosterSortColumn, setRosterSortColumn] = useState<RosterSortColumn>("name");
  const [rosterSortDirection, setRosterSortDirection] = useState<"asc" | "desc">("asc");
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryTeamFilter, setDirectoryTeamFilter] = useState("ALL");
  const [directoryRosterFilter, setDirectoryRosterFilter] = useState<FranchiseDirectoryRosterFilter>("ALL");
  const [directoryPositionFilter, setDirectoryPositionFilter] = useState("ALL");
  const [directoryRevealFilter, setDirectoryRevealFilter] = useState<FranchiseDirectoryRevealFilter>("ALL");
  const [directorySort, setDirectorySort] = useState<FranchiseDirectorySort>("name");
  const [statsSortColumn, setStatsSortColumn] = useState<string>("war");
  const [statsSortDirection, setStatsSortDirection] = useState<"asc" | "desc">("desc");
  const [franchiseTeam, setFranchiseTeam] = useState<Team | null>(null);
  const [franchiseAllPlayers, setFranchiseAllPlayers] = useState<Player[]>([]);
  const [franchiseRosterPlayers, setFranchiseRosterPlayers] = useState<Player[]>([]);
  const [franchiseFarmRecords, setFranchiseFarmRecords] = useState<FranchiseFarmRecord[]>([]);
  const [selectedProfilePlayerId, setSelectedProfilePlayerId] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState<FranchiseProfileEditForm | null>(null);
  const [profileEditBaseForm, setProfileEditBaseForm] = useState<FranchiseProfileEditForm | null>(null);
  const [profileEditErrors, setProfileEditErrors] = useState<string[]>([]);
  const [profileEditMessage, setProfileEditMessage] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [franchiseTransactionHistory, setFranchiseTransactionHistory] = useState<TransactionLogEntry[]>([]);
  const [transactionHistoryLoading, setTransactionHistoryLoading] = useState(false);
  const [transactionHistoryError, setTransactionHistoryError] = useState<string | null>(null);
  const [franchiseScheduleGames, setFranchiseScheduleGames] = useState<ScheduledGame[]>([]);
  const [franchiseCompletedGames, setFranchiseCompletedGames] = useState<CompletedGameRecord[]>([]);
  const [franchiseAtBatEvents, setFranchiseAtBatEvents] = useState<AtBatEvent[]>([]);
  const [franchiseFieldingEvents, setFranchiseFieldingEvents] = useState<FieldingEvent[]>([]);
  const [franchisePlayerTeamStints, setFranchisePlayerTeamStints] = useState<FranchisePlayerTeamStatStint[]>([]);
  const [continuityLoading, setContinuityLoading] = useState(false);
  const [continuityError, setContinuityError] = useState<string | null>(null);
  const [valueInputReport, setValueInputReport] = useState<FranchiseValueInputReport | null>(null);
  const [franchiseTrueValueRows, setFranchiseTrueValueRows] = useState<FranchiseTrueValueRow[]>([]);
  const [salaryLifecycleReport, setSalaryLifecycleReport] = useState<FranchiseSalaryLifecycleReport | null>(null);
  const [designationEligibilityReport, setDesignationEligibilityReport] = useState<FranchiseDesignationEligibilityReport | null>(null);
  const [projectedDesignationRows, setProjectedDesignationRows] = useState<FranchisePlayerDesignationRecord[]>([]);
  const [valueTruthLoading, setValueTruthLoading] = useState(false);
  const [valueTruthError, setValueTruthError] = useState<string | null>(null);
  const [randomEventRecords, setRandomEventRecords] = useState<FranchiseRandomEventLogRecord[]>([]);
  const [randomEventLoading, setRandomEventLoading] = useState(false);
  const [randomEventError, setRandomEventError] = useState<string | null>(null);
  const [randomEventActionId, setRandomEventActionId] = useState<string | null>(null);
  const [moraleSnapshots, setMoraleSnapshots] = useState<FranchiseMoraleSnapshot[]>([]);
  const [moraleLoading, setMoraleLoading] = useState(false);
  const [moraleError, setMoraleError] = useState<string | null>(null);
  const [manualMoraleActionId, setManualMoraleActionId] = useState<string | null>(null);
  const [manualMoraleMessage, setManualMoraleMessage] = useState<string | null>(null);
  const [manualMoraleError, setManualMoraleError] = useState<string | null>(null);
  const [lineupMode, setLineupMode] = useState<"DH" | "NO_DH">("NO_DH");
  const [manualLineupSlots, setManualLineupSlots] = useState<LineupSlot[]>([]);
  const [manualRotationIds, setManualRotationIds] = useState<string[]>([]);
  const [lineupRotationDirty, setLineupRotationDirty] = useState(false);
  const [isLineupRotationSaving, setIsLineupRotationSaving] = useState(false);
  const [lineupRotationMessage, setLineupRotationMessage] = useState<string | null>(null);
  const [lineupRotationError, setLineupRotationError] = useState<string | null>(null);
  const [isOptimalSaving, setIsOptimalSaving] = useState(false);
  const [optimalError, setOptimalError] = useState<string | null>(null);
  const [lineupComparison, setLineupComparison] = useState<{
    hand: OpposingPitcherHand;
    comparison: LineupSnapshotComparison;
    sourceConfidence?: string;
    generatedFallback: boolean;
  } | null>(null);
  const franchiseTeamEntries = useMemo(
    () => Object.entries(franchiseData.teamNameMap ?? {}),
    [franchiseData.teamNameMap],
  );

  // Convert real data to local formats with mock fallback
  const teams = useMemo(() => {
    if (franchiseId && franchiseTeamEntries.length > 0) {
      return franchiseTeamEntries.map(([, teamName]) => teamName);
    }
    if (hasRealData && realTeams.length > 0) {
      return realTeams.map(t => t.name);
    }
    return EMPTY_TEAMS;
  }, [franchiseId, franchiseTeamEntries, realTeams, hasRealData]);

  const stadiums = useMemo(() => {
    if (franchiseId && franchiseTeamEntries.length > 0) {
      return franchiseTeamEntries.map(([teamId, teamName]) => franchiseData.stadiumMap?.[teamId] ?? teamName);
    }
    if (hasRealData && realTeams.length > 0) {
      return realTeams.map(t => t.stadium || t.name);
    }
    return EMPTY_STADIUMS;
  }, [franchiseId, franchiseData.stadiumMap, franchiseTeamEntries, realTeams, hasRealData]);

  const selectedTeamId = useMemo(() => {
    const mapped = Object.entries(franchiseData.teamNameMap ?? {}).find(
      ([, teamName]) => teamName === selectedTeam,
    );
    if (mapped?.[0]) return mapped[0];
    const realTeam = realTeams.find((team) => team.name === selectedTeam);
    return realTeam?.id ?? "";
  }, [franchiseData.teamNameMap, realTeams, selectedTeam]);

  const franchiseLeagueId = franchiseData.franchiseConfig?.league ?? undefined;
  const useDH = lineupMode === "DH";
  const currentFranchiseLineup = useMemo(() => {
    const storedLineup = useDH ? franchiseTeam?.lineupWithDH : franchiseTeam?.lineupWithoutDH;
    return normalizeFranchiseLineupSlots(franchiseRosterPlayers, storedLineup, useDH);
  }, [franchiseRosterPlayers, franchiseTeam, useDH]);
  const franchiseRosterPlayerById = useMemo(
    () => new Map(franchiseRosterPlayers.map((player) => [player.id, player])),
    [franchiseRosterPlayers],
  );
  const manualLineupPlayerOptions = useMemo(
    () => franchiseRosterPlayers.filter((player) => !isFranchisePitcher(player)),
    [franchiseRosterPlayers],
  );
  const manualRotationPlayerOptions = useMemo(
    () => getFranchiseRotationCandidates(franchiseRosterPlayers),
    [franchiseRosterPlayers],
  );
  const manualFieldingPositionOptions = useMemo(
    () => useDH ? [...FRANCHISE_FIELD_POSITIONS, 'DH' as Position] : FRANCHISE_FIELD_POSITIONS,
    [useDH],
  );
  const storedLineupRotationWarnings = useMemo(() => {
    const storedLineup = useDH ? franchiseTeam?.lineupWithDH : franchiseTeam?.lineupWithoutDH;
    return describeStoredLineupRotationWarnings(
      franchiseRosterPlayers,
      storedLineup,
      franchiseTeam?.startingRotation,
      useDH,
    );
  }, [franchiseRosterPlayers, franchiseTeam, useDH]);
  const duplicateManualLineupIds = useMemo(
    () => duplicateIds(manualLineupSlots.map((slot) => slot.playerId)),
    [manualLineupSlots],
  );
  const duplicateManualRotationIds = useMemo(
    () => duplicateIds(manualRotationIds),
    [manualRotationIds],
  );
  const duplicateManualLineupPositions = useMemo(
    () => duplicateIds(manualLineupSlots.map((slot) => slot.fieldingPosition)),
    [manualLineupSlots],
  );
  const missingManualLineupPositions = useMemo(() => {
    const assignedPositions = new Set(manualLineupSlots.map((slot) => slot.fieldingPosition));
    return expectedManualLineupPositions(useDH).filter((position) => !assignedPositions.has(position));
  }, [manualLineupSlots, useDH]);
  const lineupRotationBlockingMessage = useMemo(() => {
    if (duplicateManualLineupIds.length > 0) {
      return `Lineup has duplicate players: ${duplicateManualLineupIds.join(', ')}.`;
    }
    if (duplicateManualLineupPositions.length > 0) {
      return `Lineup has duplicate defensive positions: ${duplicateManualLineupPositions.join(', ')}.`;
    }
    if (missingManualLineupPositions.length > 0) {
      return `Lineup is missing defensive positions: ${missingManualLineupPositions.join(', ')}.`;
    }
    if (duplicateManualRotationIds.length > 0) {
      return `Rotation has duplicate pitchers: ${duplicateManualRotationIds.join(', ')}.`;
    }
    return null;
  }, [
    duplicateManualLineupIds,
    duplicateManualLineupPositions,
    duplicateManualRotationIds,
    missingManualLineupPositions,
  ]);

  useEffect(() => {
    setLineupComparison(null);
  }, [selectedTeam, useDH]);

  useEffect(() => {
    if (!franchiseTeam) {
      setManualLineupSlots([]);
      setManualRotationIds([]);
      setLineupRotationDirty(false);
      setLineupRotationMessage(null);
      setLineupRotationError(null);
      return;
    }

    const storedLineup = useDH ? franchiseTeam.lineupWithDH : franchiseTeam.lineupWithoutDH;
    setManualLineupSlots(buildEditableFranchiseLineupSlots(franchiseRosterPlayers, storedLineup, useDH));
    setManualRotationIds(normalizeFranchiseRotationIds(franchiseRosterPlayers, franchiseTeam.startingRotation));
    setLineupRotationDirty(false);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  }, [franchiseRosterPlayers, franchiseTeam, useDH]);

  useEffect(() => {
    if (!franchiseId || !selectedTeamId) {
      setFranchiseTeam(null);
      setFranchiseAllPlayers([]);
      setFranchiseRosterPlayers([]);
      setFranchiseFarmRecords([]);
      return;
    }

    let cancelled = false;
    const activeFranchiseId = franchiseId;

    async function loadFranchiseOptimalState() {
      try {
        setOptimalError(null);
        const [team, allPlayers, farmRecords] = await Promise.all([
          getFranchiseTeam(activeFranchiseId, selectedTeamId),
          getAllFranchisePlayers(activeFranchiseId),
          getFranchiseFarmRoster(activeFranchiseId, seasonId, selectedTeamId),
        ]);

        if (cancelled) return;

        setFranchiseTeam(team);
        setFranchiseAllPlayers(allPlayers);
        setFranchiseFarmRecords(farmRecords);
        setFranchiseRosterPlayers(
          allPlayers.filter((player) =>
            isActiveFranchisePlayerForTeam(player, selectedTeamId, franchiseLeagueId),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setOptimalError(err instanceof Error ? err.message : "Failed to load franchise optimal lineup state.");
        }
      }
    }

    void loadFranchiseOptimalState();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, franchiseLeagueId, seasonId, selectedTeamId]);

  useEffect(() => {
    if (!franchiseId || !seasonId) {
      setFranchiseTransactionHistory([]);
      setTransactionHistoryLoading(false);
      setTransactionHistoryError(null);
      return;
    }

    let cancelled = false;
    const activeFranchiseId = franchiseId;
    const activeSeasonId = seasonId;

    async function loadFranchiseTransactionHistory() {
      setTransactionHistoryLoading(true);
      setTransactionHistoryError(null);
      try {
        const entries = await getTransactionsByFranchiseSeason(activeFranchiseId, activeSeasonId);
        if (cancelled) return;
        setFranchiseTransactionHistory(
          entries
            .filter((entry) =>
              entry.franchiseId === activeFranchiseId &&
              entry.seasonId === activeSeasonId &&
              (entry.statsScopeId ?? activeSeasonId) === activeSeasonId &&
              FRANCHISE_TEAM_HUB_HISTORY_TYPES.has(entry.type as Mode2V1TransactionType) &&
              !entry.undone,
            )
            .sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
        );
      } catch (err) {
        if (!cancelled) {
          setFranchiseTransactionHistory([]);
          setTransactionHistoryError(err instanceof Error ? err.message : 'Failed to load franchise transaction history.');
        }
      } finally {
        if (!cancelled) {
          setTransactionHistoryLoading(false);
        }
      }
    }

    void loadFranchiseTransactionHistory();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId]);

  useEffect(() => {
    if (!franchiseId || !seasonId) {
      setFranchiseScheduleGames([]);
      setFranchiseCompletedGames([]);
      setFranchiseAtBatEvents([]);
      setFranchiseFieldingEvents([]);
      setFranchisePlayerTeamStints([]);
      setContinuityLoading(false);
      setContinuityError(null);
      return;
    }

    let cancelled = false;
    const activeFranchiseId = franchiseId;
    const activeSeasonId = seasonId;
    const activeSeasonNumber = seasonNumber;

    async function loadContinuitySources() {
      setContinuityLoading(true);
      setContinuityError(null);
      try {
        const [scheduleRows, completedRows] = await Promise.all([
          getAllGamesByFranchise(activeFranchiseId, activeSeasonNumber),
          getRecentGames(1000, { franchiseId: activeFranchiseId, seasonId: activeSeasonId }),
        ]);
        const eventDetails = await Promise.all(
          completedRows.map(async (game) => {
            try {
              const [atBats, fielding] = await Promise.all([
                getGameEvents(game.gameId),
                getGameFieldingEvents(game.gameId),
              ]);
              return { atBats, fielding };
            } catch {
              return { atBats: [] as AtBatEvent[], fielding: [] as FieldingEvent[] };
            }
          }),
        );
        if (cancelled) return;
        setFranchiseScheduleGames(scheduleRows);
        setFranchiseCompletedGames(completedRows);
        setFranchiseAtBatEvents(eventDetails.flatMap((details) => details.atBats));
        setFranchiseFieldingEvents(eventDetails.flatMap((details) => details.fielding));
        setFranchisePlayerTeamStints(
          buildFranchisePlayerTeamStatStints(completedRows, {
            franchiseId: activeFranchiseId,
            seasonId: activeSeasonId,
            statsScopeId: activeSeasonId,
            competitionType: 'franchise',
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setFranchiseScheduleGames([]);
          setFranchiseCompletedGames([]);
          setFranchiseAtBatEvents([]);
          setFranchiseFieldingEvents([]);
          setFranchisePlayerTeamStints([]);
          setContinuityError(err instanceof Error ? err.message : 'Failed to load franchise player continuity sources.');
        }
      } finally {
        if (!cancelled) {
          setContinuityLoading(false);
        }
      }
    }

    void loadContinuitySources();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  useEffect(() => {
    if (!franchiseId || !seasonId) {
      setValueInputReport(null);
      setFranchiseTrueValueRows([]);
      setSalaryLifecycleReport(null);
      setDesignationEligibilityReport(null);
      setProjectedDesignationRows([]);
      setValueTruthLoading(false);
      setValueTruthError(null);
      return;
    }

    let cancelled = false;
    const input = {
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber,
    };

    async function loadValueTruthReports() {
      setValueTruthLoading(true);
      setValueTruthError(null);
      try {
        const salaryReport = await buildFranchiseSalaryLifecycle(input, { syncCurrentSalaries: true });
        const [valueReport, designationReport, designationRows, trueValueRows] = await Promise.all([
          buildFranchiseValueInputRows(input),
          buildFranchiseDesignationEligibility(input),
          getFranchiseDesignationRows(input),
          getFranchiseTrueValueRows(input),
        ]);
        if (cancelled) return;
        setValueInputReport(valueReport);
        setFranchiseTrueValueRows(trueValueRows);
        setSalaryLifecycleReport(salaryReport);
        setDesignationEligibilityReport(designationReport);
        setProjectedDesignationRows(designationRows);
      } catch (err) {
        if (!cancelled) {
          setValueInputReport(null);
          setFranchiseTrueValueRows([]);
          setSalaryLifecycleReport(null);
          setDesignationEligibilityReport(null);
          setProjectedDesignationRows([]);
          setValueTruthError(err instanceof Error ? err.message : 'Failed to load Franchise v1 value truth labels.');
        }
      } finally {
        if (!cancelled) {
          setValueTruthLoading(false);
        }
      }
    }

    void loadValueTruthReports();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  const trueValuePreviewReport = useMemo(() => {
    if (!valueInputReport) return null;
    return buildFranchiseTrueValuePreviewReport(valueInputReport);
  }, [valueInputReport]);

  const expectedWinsPreviewReport = useMemo(() => {
    if (!trueValuePreviewReport) return null;
    return buildFranchiseExpectedWinsPreviewReport(trueValuePreviewReport);
  }, [trueValuePreviewReport]);

  const analyticsTrustReport = useMemo(() => {
    if (!valueInputReport) return null;
    return buildFranchiseAnalyticsTrustReport({
      valueInputReport,
      completedGames: franchiseCompletedGames,
      scheduledGames: franchiseScheduleGames,
      teamStints: franchisePlayerTeamStints,
    });
  }, [
    franchiseCompletedGames,
    franchisePlayerTeamStints,
    franchiseScheduleGames,
    valueInputReport,
  ]);

  const moraleRelationshipTrustReport = useMemo(() => {
    if (!valueInputReport) return null;
    return buildFranchiseMoraleRelationshipTrustReport({
      valueInputReport,
      players: franchiseAllPlayers,
      transactions: franchiseTransactionHistory,
      completedGames: franchiseCompletedGames,
      scheduledGames: franchiseScheduleGames,
    });
  }, [
    franchiseAllPlayers,
    franchiseCompletedGames,
    franchiseScheduleGames,
    franchiseTransactionHistory,
    valueInputReport,
  ]);

  const narrativeEventEligibilityReport = useMemo(() => {
    if (!analyticsTrustReport) return null;
    return buildFranchiseNarrativeEventEligibilityReport({
      analyticsTrustReport,
      valueInputReport: valueInputReport ?? undefined,
      salaryLifecycleReport: salaryLifecycleReport ?? undefined,
      designationEligibilityReport: designationEligibilityReport ?? undefined,
      moraleRelationshipTrustReport: moraleRelationshipTrustReport ?? undefined,
    });
  }, [
    analyticsTrustReport,
    designationEligibilityReport,
    moraleRelationshipTrustReport,
    salaryLifecycleReport,
    valueInputReport,
  ]);

  const stadiumFoundationReport = useMemo(() => {
    if (!franchiseId) return null;
    return buildFranchiseStadiumFoundationReport({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber,
      stadiumSnapshots: franchiseTeamEntries.map(([teamId, teamName]) => ({
        teamId,
        teamName,
        stadium: franchiseData.stadiumMap?.[teamId] ?? teamName,
        stadiumId: undefined,
        hasSeedParkFactors: false,
      })),
      completedGames: franchiseCompletedGames,
      atBatEvents: franchiseAtBatEvents,
      fieldingEvents: franchiseFieldingEvents,
    });
  }, [
    franchiseAtBatEvents,
    franchiseCompletedGames,
    franchiseData.stadiumMap,
    franchiseFieldingEvents,
    franchiseId,
    franchiseTeamEntries,
    seasonId,
    seasonNumber,
  ]);

  const designationMoraleContextReport = useMemo(() => {
    if (!designationEligibilityReport) return null;
    return buildFranchiseDesignationMoraleContextAdapterReport(designationEligibilityReport);
  }, [designationEligibilityReport]);

  const randomEventLogReport = useMemo(() => {
    if (!franchiseId) return null;
    const randomEventFarmRecordByPlayerId = new Map(franchiseFarmRecords.map((record) => [record.playerId, record]));
    return buildGeneratedFranchiseRandomEventLogReport({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber,
      seed: `team-hub:${franchiseId}:${seasonId}:${seasonNumber}`,
      completedGames: franchiseCompletedGames,
      scoreOnlyScheduleRows: franchiseScheduleGames,
      rosterTransactions: franchiseTransactionHistory,
      players: franchiseAllPlayers.map((player) => buildRandomEventPlayerEvidence(player, {
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        leagueId: franchiseLeagueId,
        farmRecordByPlayerId: randomEventFarmRecordByPlayerId,
      })),
      stadiumFoundationReport: stadiumFoundationReport ?? undefined,
      designationMoraleContexts: designationMoraleContextReport?.contexts,
    });
  }, [
    designationMoraleContextReport,
    franchiseAllPlayers,
    franchiseCompletedGames,
    franchiseFarmRecords,
    franchiseId,
    franchiseLeagueId,
    franchiseScheduleGames,
    franchiseTransactionHistory,
    seasonId,
    seasonNumber,
    stadiumFoundationReport,
  ]);

  const refreshRandomEventWorkflow = useCallback(async () => {
    if (!franchiseId || !seasonId) {
      setRandomEventRecords([]);
      setMoraleSnapshots([]);
      return;
    }

    if (randomEventLogReport) {
      await syncFranchiseRandomEventLogFromReport(randomEventLogReport);
    }
    const [records, snapshots] = await Promise.all([
      listFranchiseRandomEventLogRecords(franchiseId, seasonId, seasonId, seasonNumber),
      listFranchiseMoraleSnapshots(franchiseId, seasonId, seasonId, seasonNumber),
    ]);
    setRandomEventRecords(records);
    setMoraleSnapshots(snapshots);
  }, [franchiseId, randomEventLogReport, seasonId, seasonNumber]);

  useEffect(() => {
    if (!franchiseId || !seasonId) {
      setRandomEventRecords([]);
      setRandomEventLoading(false);
      setRandomEventError(null);
      setMoraleSnapshots([]);
      setMoraleLoading(false);
      setMoraleError(null);
      return;
    }

    let cancelled = false;
    const activeFranchiseId = franchiseId;
    const activeSeasonId = seasonId;

    async function loadRandomEventWorkflow() {
      setRandomEventLoading(true);
      setMoraleLoading(true);
      setRandomEventError(null);
      setMoraleError(null);
      try {
        if (randomEventLogReport) {
          await syncFranchiseRandomEventLogFromReport(randomEventLogReport);
        }
        const [records, snapshots] = await Promise.all([
          listFranchiseRandomEventLogRecords(activeFranchiseId, activeSeasonId, activeSeasonId, seasonNumber),
          listFranchiseMoraleSnapshots(activeFranchiseId, activeSeasonId, activeSeasonId, seasonNumber),
        ]);
        if (cancelled) return;
        setRandomEventRecords(records);
        setMoraleSnapshots(snapshots);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load Franchise random event workflow.';
          setRandomEventError(message);
          setMoraleError(message);
          setRandomEventRecords([]);
          setMoraleSnapshots([]);
        }
      } finally {
        if (!cancelled) {
          setRandomEventLoading(false);
          setMoraleLoading(false);
        }
      }
    }

    void loadRandomEventWorkflow();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, randomEventLogReport, seasonId, seasonNumber]);

  const confirmRandomEventRecord = useCallback(async (recordId: string) => {
    setRandomEventActionId(recordId);
    setRandomEventError(null);
    setMoraleError(null);
    try {
      const record = randomEventRecords.find((candidate) => candidate.id === recordId);
      await confirmFranchiseRandomEventLogRecord({
        recordId,
        ...(record ? randomEventSafeEffectTarget(record, selectedTeamId || undefined) : { targetTeamId: selectedTeamId || undefined }),
        actorDisplayName: 'User',
      });
      await refreshRandomEventWorkflow();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm random event prompt.';
      setRandomEventError(message);
    } finally {
      setRandomEventActionId(null);
    }
  }, [randomEventRecords, refreshRandomEventWorkflow, selectedTeamId]);

  const dismissRandomEventRecord = useCallback(async (recordId: string) => {
    setRandomEventActionId(recordId);
    setRandomEventError(null);
    try {
      await dismissFranchiseRandomEventLogRecord(recordId, 'User');
      await refreshRandomEventWorkflow();
    } catch (err) {
      setRandomEventError(err instanceof Error ? err.message : 'Failed to dismiss random event prompt.');
    } finally {
      setRandomEventActionId(null);
    }
  }, [refreshRandomEventWorkflow]);

  const applyManualMoraleAdjustment = useCallback(async (input: {
    targetType: FranchiseMoraleTargetType;
    targetId: string;
    delta: number;
    reason: string;
  }) => {
    if (!franchiseId || !seasonId) return;
    const trimmedReason = input.reason.trim();
    const actionId = `manual:${input.targetType}:${input.targetId}`;
    setManualMoraleActionId(actionId);
    setManualMoraleMessage(null);
    setManualMoraleError(null);
    setMoraleError(null);
    try {
      const timestamp = new Date().toISOString();
      const result = await applyFranchiseMoraleEffect({
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        targetType: input.targetType,
        teamId: input.targetType === 'team-fan' ? input.targetId : undefined,
        playerId: input.targetType === 'player' ? input.targetId : undefined,
        delta: input.delta,
        reason: trimmedReason,
        sourceEventId: `${actionId}:${timestamp}`,
        sourceKind: 'manual-override',
        actorDisplayName: 'User',
        timestamp,
      });
      if (result.status === 'failed') {
        throw new Error(result.reason || 'Manual morale adjustment failed.');
      }
      setManualMoraleMessage(
        result.status === 'skipped'
          ? 'Manual morale adjustment was already recorded for this source.'
          : `Manual morale adjustment applied: ${result.previousValue} → ${result.currentValue} (${result.delta > 0 ? '+' : ''}${result.delta}).`,
      );
      await refreshRandomEventWorkflow();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply manual morale adjustment.';
      setManualMoraleError(message);
      setMoraleError(message);
    } finally {
      setManualMoraleActionId(null);
    }
  }, [franchiseId, refreshRandomEventWorkflow, seasonId, seasonNumber]);

  const analyzerReport = useMemo(() => {
    if (!franchiseId || !selectedTeamId || !franchiseTeam) return null;
    return analyzeFranchiseTeamRoster({
      franchiseId,
      seasonId,
      seasonNumber,
      statsScopeId: seasonId,
      leagueId: franchiseLeagueId,
      team: franchiseTeam,
      players: franchiseAllPlayers,
      farmRecords: franchiseFarmRecords,
      trueValueRows: franchiseTrueValueRows,
      generatedAt: 'franchise-team-hub',
    });
  }, [
    franchiseAllPlayers,
    franchiseFarmRecords,
    franchiseTrueValueRows,
    franchiseId,
    franchiseLeagueId,
    franchiseTeam,
    seasonId,
    seasonNumber,
    selectedTeamId,
  ]);

  const franchiseFarmPlayers = useMemo(() => {
    if (!franchiseId || !selectedTeamId) return [];
    return franchiseAllPlayers.filter((player) =>
      isFarmFranchisePlayerForTeam(player, selectedTeamId, franchiseLeagueId),
    );
  }, [franchiseAllPlayers, franchiseId, franchiseLeagueId, selectedTeamId]);

  const farmRecordByPlayerId = useMemo(() => {
    return new Map(franchiseFarmRecords.map((record) => [record.playerId, record]));
  }, [franchiseFarmRecords]);

  const farmPlayerById = useMemo(() => {
    return new Map(franchiseFarmPlayers.map((player) => [player.id, player]));
  }, [franchiseFarmPlayers]);

  const farmPlayersMissingRecords = useMemo(() => {
    return franchiseFarmPlayers.filter((player) => !farmRecordByPlayerId.has(player.id));
  }, [farmRecordByPlayerId, franchiseFarmPlayers]);

  const orphanFarmRecords = useMemo(() => {
    return franchiseFarmRecords.filter((record) => !farmPlayerById.has(record.playerId));
  }, [farmPlayerById, franchiseFarmRecords]);

  const franchiseDirectoryRows = useMemo(() => {
    const search = directorySearch.trim().toLowerCase();
    const rows = franchiseAllPlayers
      .map((player) =>
        buildFranchiseDirectoryRow(player, franchiseData.teamNameMap ?? {}, franchiseLeagueId),
      )
      .filter((row) => {
        if (search && !row.name.toLowerCase().includes(search)) return false;
        if (directoryTeamFilter !== 'ALL' && row.teamId !== directoryTeamFilter) return false;
        if (directoryRosterFilter !== 'ALL') {
          if (directoryRosterFilter === 'UNASSIGNED') {
            if (row.rosterStatus !== 'UNASSIGNED' && row.rosterStatus !== 'UNKNOWN') return false;
          } else if (row.rosterStatus !== directoryRosterFilter) {
            return false;
          }
        }
        if (!franchiseDirectoryPositionMatches(row, directoryPositionFilter)) return false;
        if (directoryRevealFilter !== 'ALL' && row.revealState.toUpperCase() !== directoryRevealFilter) return false;
        return true;
      });

    rows.sort((left, right) => {
      if (directorySort === 'grade') {
        return right.gradeSortValue - left.gradeSortValue || left.name.localeCompare(right.name);
      }
      const leftValue = directorySort === 'name'
        ? left.name
        : directorySort === 'team'
          ? left.teamName
          : directorySort === 'rosterStatus'
            ? left.rosterStatus
            : left.primaryPosition;
      const rightValue = directorySort === 'name'
        ? right.name
        : directorySort === 'team'
          ? right.teamName
          : directorySort === 'rosterStatus'
            ? right.rosterStatus
            : right.primaryPosition;
      return String(leftValue).localeCompare(String(rightValue)) || left.name.localeCompare(right.name);
    });

    return rows;
  }, [
    directoryPositionFilter,
    directoryRevealFilter,
    directoryRosterFilter,
    directorySearch,
    directorySort,
    directoryTeamFilter,
    franchiseAllPlayers,
    franchiseData.teamNameMap,
    franchiseLeagueId,
  ]);

  const franchiseDirectoryPositionOptions = useMemo(() => {
    const positions = Array.from(new Set(franchiseAllPlayers.map((player) => String(player.primaryPosition ?? '')).filter(Boolean))).sort();
    return ['ALL', 'FIELDERS', 'PITCHERS', ...positions];
  }, [franchiseAllPlayers]);

  const selectedProfilePlayer = useMemo(() => {
    if (!selectedProfilePlayerId) return null;
    return franchiseAllPlayers.find((candidate) => candidate.id === selectedProfilePlayerId) ?? null;
  }, [franchiseAllPlayers, selectedProfilePlayerId]);

  const selectedProfile = useMemo(() => {
    const player = selectedProfilePlayer;
    if (!player) return null;
    return buildFranchisePlayerProfileViewModel({
      player,
      farmRecord: farmRecordByPlayerId.get(player.id) ?? null,
      teamId: selectedTeamId,
      leagueId: franchiseLeagueId,
    });
  }, [
    farmRecordByPlayerId,
    franchiseLeagueId,
    selectedProfilePlayer,
    selectedTeamId,
  ]);

  const selectedProfileProjectedDesignations = useMemo(() => {
    if (!selectedProfile) return [];
    return projectedDesignationRows.filter((designation) =>
      designation.playerId === selectedProfile.playerId &&
      (designation.status === 'projected' || designation.status === 'active') &&
      (!selectedProfile.teamId || designation.teamId === selectedProfile.teamId),
    );
  }, [projectedDesignationRows, selectedProfile]);

  const selectedProfileContinuity = useMemo(() => {
    if (!franchiseId || !selectedProfilePlayer) return null;
    return buildFranchisePlayerContinuity({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber,
      player: selectedProfilePlayer,
      farmRecord: farmRecordByPlayerId.get(selectedProfilePlayer.id) ?? null,
      teamId: selectedTeamId,
      leagueId: franchiseLeagueId,
      transactions: franchiseTransactionHistory,
      completedGames: franchiseCompletedGames,
      scheduledGames: franchiseScheduleGames,
      teamStints: franchisePlayerTeamStints,
    });
  }, [
    farmRecordByPlayerId,
    franchiseCompletedGames,
    franchiseId,
    franchiseLeagueId,
    franchisePlayerTeamStints,
    franchiseScheduleGames,
    franchiseTransactionHistory,
    seasonId,
    seasonNumber,
    selectedProfilePlayer,
    selectedTeamId,
  ]);

  const selectedProfileRelationshipContext = useMemo(() => {
    if (!selectedProfile) return null;
    return buildFranchiseRelationshipContextPreview({
      franchiseId: franchiseId ?? '',
      seasonId,
      statsScopeId: seasonId,
      seasonNumber,
      profile: selectedProfile,
      trustReport: moraleRelationshipTrustReport,
    });
  }, [
    franchiseId,
    moraleRelationshipTrustReport,
    seasonId,
    seasonNumber,
    selectedProfile,
  ]);

  useEffect(() => {
    setSelectedProfilePlayerId(null);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedProfilePlayer) {
      setProfileEditMode(false);
      setProfileEditForm(null);
      setProfileEditBaseForm(null);
      setProfileEditErrors([]);
      setProfileEditMessage(null);
      return;
    }
    if (!profileEditMode) {
      const form = buildProfileEditForm(selectedProfilePlayer);
      setProfileEditForm(form);
      setProfileEditBaseForm(form);
      setProfileEditErrors([]);
    }
  }, [profileEditMode, selectedProfilePlayer]);

  const closeSelectedProfile = () => {
    setSelectedProfilePlayerId(null);
    setProfileEditMode(false);
    setProfileEditForm(null);
    setProfileEditBaseForm(null);
    setProfileEditErrors([]);
    setProfileEditMessage(null);
    setIsProfileSaving(false);
  };

  const startProfileEdit = () => {
    if (!selectedProfilePlayer) return;
    const form = buildProfileEditForm(selectedProfilePlayer);
    setProfileEditForm(form);
    setProfileEditBaseForm(form);
    setProfileEditErrors([]);
    setProfileEditMessage(null);
    setProfileEditMode(true);
  };

  const cancelProfileEdit = () => {
    if (selectedProfilePlayer) {
      const form = buildProfileEditForm(selectedProfilePlayer);
      setProfileEditForm(form);
      setProfileEditBaseForm(form);
    }
    setProfileEditErrors([]);
    setProfileEditMessage(null);
    setProfileEditMode(false);
  };

  const handleSaveProfileEdit = async () => {
    if (!franchiseId || !selectedProfile || !selectedProfilePlayer || !profileEditForm || !profileEditBaseForm) return;

    setIsProfileSaving(true);
    setProfileEditErrors([]);
    setProfileEditMessage(null);

    try {
      const freshPlayer = await getFranchisePlayer(franchiseId, selectedProfilePlayer.id);
      if (!freshPlayer) {
        setProfileEditErrors(['Franchise player record was not found.']);
        return;
      }

      const payload = profileEditFormToPayload(profileEditForm, profileEditBaseForm);
      if (selectedProfile.hiddenSafe) {
        delete payload.power;
        delete payload.contact;
        delete payload.speed;
        delete payload.fielding;
        delete payload.arm;
        delete payload.velocity;
        delete payload.junk;
        delete payload.accuracy;
        delete payload.arsenal;
        delete payload.overallGrade;
      }

      const editResult = applyFranchisePlayerProfileEdit({
        player: freshPlayer,
        farmRecord: farmRecordByPlayerId.get(freshPlayer.id) ?? null,
        teamId: selectedTeamId,
        leagueId: franchiseLeagueId,
        changes: payload,
      });

      if (!editResult.valid) {
        setProfileEditErrors(editResult.errors);
        return;
      }

      const savedPlayer = await saveFranchisePlayer(franchiseId, editResult.player);
      setFranchiseAllPlayers((players) =>
        players.map((player) => player.id === savedPlayer.id ? savedPlayer : player),
      );
      setFranchiseRosterPlayers((players) =>
        players.map((player) => player.id === savedPlayer.id ? savedPlayer : player),
      );
      const savedForm = buildProfileEditForm(savedPlayer);
      setProfileEditForm(savedForm);
      setProfileEditBaseForm(savedForm);
      setProfileEditMode(false);
      setProfileEditMessage('Profile saved to franchise-owned player record.');
    } catch (err) {
      setProfileEditErrors([err instanceof Error ? err.message : 'Failed to save franchise player profile.']);
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Default to first team once data loads
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
      setSelectedStadium(stadiums[0] || teams[0]);
    }
  }, [teams, stadiums, selectedTeam]);

  // Build lookup maps from season stats for real WAR
  const battingByPlayer = useMemo(() => {
    const map = new Map<string, BattingLeaderEntry>();
    if (!seasonStats.isLoading) {
      // Get all batting leaders (large limit to capture all players)
      const allBatters = seasonStats.getBattingLeaders('totalWAR', 500);
      for (const b of allBatters) {
        map.set(b.playerId, b);
      }
    }
    return map;
  }, [seasonStats.isLoading, seasonStats.getBattingLeaders]);

  const pitchingByPlayer = useMemo(() => {
    const map = new Map<string, PitchingLeaderEntry>();
    if (!seasonStats.isLoading) {
      const allPitchers = seasonStats.getPitchingLeaders('pWAR', 500);
      for (const p of allPitchers) {
        map.set(p.playerId, p);
      }
    }
    return map;
  }, [seasonStats.isLoading, seasonStats.getPitchingLeaders]);

  const moraleSnapshotByPlayerId = useMemo(() => {
    const map = new Map<string, FranchiseMoraleSnapshot>();
    for (const snapshot of moraleSnapshots) {
      if (snapshot.targetType === 'player' && snapshot.playerId) {
        map.set(snapshot.playerId, snapshot);
      }
    }
    return map;
  }, [moraleSnapshots]);

  const rosterFarmRecordByPlayerId = useMemo(() => {
    const map = new Map<string, FranchiseFarmRecord>();
    for (const record of franchiseFarmRecords) {
      map.set(record.playerId, record);
    }
    return map;
  }, [franchiseFarmRecords]);

  // Get roster for selected team
  const rosterData = useMemo(() => {
    if (franchiseId && selectedTeamId) {
      return franchiseAllPlayers
        .filter((player) =>
          isActiveFranchisePlayerForTeam(player, selectedTeamId, franchiseLeagueId) ||
          isFarmFranchisePlayerForTeam(player, selectedTeamId, franchiseLeagueId)
        )
        .map((player, index) => convertFranchisePlayerToRosterItem({
          player,
          leagueId: franchiseLeagueId,
          teamName: selectedTeam,
          moraleSnapshot: moraleSnapshotByPlayerId.get(player.id),
          batting: battingByPlayer.get(player.id),
          pitching: pitchingByPlayer.get(player.id),
          projectedDesignationRows,
          farmRecordByPlayerId: rosterFarmRecordByPlayerId,
          originalIndex: index,
        }));
    }
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      const selectedTeamObj = realTeams.find(t => t.name === selectedTeam);
      if (selectedTeamObj) {
        const teamPlayers = realPlayers.filter(p => p.teamId === selectedTeamObj.id).slice(0, 15);
        if (teamPlayers.length > 0) {
          return teamPlayers.map((p, index) => ({ ...convertToRosterItem(p), originalIndex: index }));
        }
      }
    }
    return EMPTY_ROSTER_DATA;
  }, [
    franchiseId,
    selectedTeamId,
    franchiseAllPlayers,
    franchiseLeagueId,
    selectedTeam,
    moraleSnapshotByPlayerId,
    battingByPlayer,
    pitchingByPlayer,
    projectedDesignationRows,
    rosterFarmRecordByPlayerId,
    realPlayers,
    realTeams,
    hasRealData,
  ]);

  // Get stats for selected team
  const statsData = useMemo(() => {
    if (franchiseId && selectedTeamId) {
      return franchiseRosterPlayers.map((player) => {
        const batting = battingByPlayer.get(player.id);
        const pitching = pitchingByPlayer.get(player.id);
        return convertFranchisePlayerToStatsItem(player, batting, pitching);
      }).sort((a, b) => b.war - a.war);
    }
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      const selectedTeamObj = realTeams.find(t => t.name === selectedTeam);
      if (selectedTeamObj) {
        const teamPlayers = realPlayers.filter(p => p.teamId === selectedTeamObj.id).slice(0, 15);
        if (teamPlayers.length > 0) {
          // Try to use real WAR from season stats
          const hasSeasonData = battingByPlayer.size > 0 || pitchingByPlayer.size > 0;
          return teamPlayers.map(p => {
            const batting = battingByPlayer.get(p.id);
            const pitching = pitchingByPlayer.get(p.id);
            if (hasSeasonData && (batting || pitching)) {
              return convertToStatsItemFromSeason(p, batting, pitching);
            }
            return convertToStatsItem(p);
          }).sort((a, b) => b.war - a.war);
        }
      }
    }
    return EMPTY_STATS_DATA;
  }, [franchiseId, selectedTeamId, franchiseRosterPlayers, realPlayers, realTeams, selectedTeam, hasRealData, battingByPlayer, pitchingByPlayer]);

  // NOTE: Fan morale, stadium park factors, and manager tracking
  // are not yet implemented — their tabs show empty states.

  // Sorting functions
  const handleRosterSort = (column: RosterSortColumn) => {
    if (rosterSortColumn === column) {
      setRosterSortDirection(rosterSortDirection === "asc" ? "desc" : "asc");
    } else {
      setRosterSortColumn(column);
      setRosterSortDirection("asc");
    }
  };

  const handleStatsSort = (column: string) => {
    if (statsSortColumn === column) {
      setStatsSortDirection(statsSortDirection === "asc" ? "desc" : "asc");
    } else {
      setStatsSortColumn(column);
      setStatsSortDirection("desc");
    }
  };

  const getSortedRoster = () => {
    const valueFor = (row: RosterTableItem): string | number => {
      if (rosterSortColumn === 'salary') return row.salarySortValue;
      if (rosterSortColumn === 'morale') return typeof row.morale === 'number' ? row.morale : Number.NEGATIVE_INFINITY;
      if (rosterSortColumn === 'stat') return row.statSortValue;
      if (rosterSortColumn === 'designation') return row.designationSummary;
      return row[rosterSortColumn];
    };

    return [...rosterData].sort((a, b) => {
      const aVal = valueFor(a);
      const bVal = valueFor(b);
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      if (comparison !== 0) return rosterSortDirection === "asc" ? comparison : -comparison;
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) return nameComparison;
      return a.originalIndex - b.originalIndex;
    });
  };

  const getSortedStats = () => {
    const sorted = [...statsData].sort((a, b) => {
      let aVal: any = a[statsSortColumn as keyof typeof a];
      let bVal: any = b[statsSortColumn as keyof typeof b];

      if (aVal < bVal) return statsSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return statsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const saveFranchiseOptimalUpdate = async (update: Partial<Team>) => {
    if (!franchiseId || !franchiseTeam) return;

    setLineupComparison(null);
    setIsOptimalSaving(true);
    setOptimalError(null);
    try {
      const nextTeam = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(franchiseTeam, update);
      const savedTeam = await saveFranchiseTeam(franchiseId, nextTeam);
      setFranchiseTeam(savedTeam);
    } catch (err) {
      setOptimalError(err instanceof Error ? err.message : "Failed to save franchise optimal lineup.");
    } finally {
      setIsOptimalSaving(false);
    }
  };

  const updateManualLineupSlot = (index: number, update: Partial<LineupSlot>) => {
    setManualLineupSlots((slots) =>
      slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...update } : slot,
      ),
    );
    setLineupRotationDirty(true);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  };

  const moveManualLineupSlot = (index: number, direction: -1 | 1) => {
    setManualLineupSlots((slots) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= slots.length) return slots;
      const next = [...slots];
      const [slot] = next.splice(index, 1);
      next.splice(nextIndex, 0, slot);
      return next.map((lineupSlot, slotIndex) => ({
        ...lineupSlot,
        battingOrder: slotIndex + 1,
      }));
    });
    setLineupRotationDirty(true);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  };

  const moveManualRotationSlot = (index: number, direction: -1 | 1) => {
    setManualRotationIds((rotationIds) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= rotationIds.length) return rotationIds;
      const next = [...rotationIds];
      const [playerId] = next.splice(index, 1);
      next.splice(nextIndex, 0, playerId);
      return next;
    });
    setLineupRotationDirty(true);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  };

  const rebuildManualLineupRotationFromMlb = () => {
    setManualLineupSlots(buildEditableFranchiseLineupSlots(franchiseRosterPlayers, undefined, useDH));
    setManualRotationIds(normalizeFranchiseRotationIds(franchiseRosterPlayers, undefined));
    setLineupRotationDirty(true);
    setLineupRotationMessage("Rebuilt from current MLB assignments. Save to make it durable.");
    setLineupRotationError(null);
  };

  const handleSaveLineupRotation = async () => {
    if (!franchiseId || !franchiseTeam || lineupRotationBlockingMessage) return;

    setLineupComparison(null);
    setIsLineupRotationSaving(true);
    setLineupRotationError(null);
    setLineupRotationMessage(null);

    try {
      const normalizedRotationIds = normalizeFranchiseRotationIds(franchiseRosterPlayers, manualRotationIds);
      const lineupForSave = buildManualLineupForSave(
        franchiseRosterPlayers,
        manualLineupSlots,
        normalizedRotationIds,
        useDH,
      );
      const update: Partial<Team> = {
        startingRotation: normalizedRotationIds,
        [useDH ? "lineupWithDH" : "lineupWithoutDH"]: lineupForSave,
      };
      const nextTeam = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(franchiseTeam, update);
      const savedTeam = await saveFranchiseTeam(franchiseId, nextTeam);
      setFranchiseTeam(savedTeam);
      setLineupRotationDirty(false);
      setLineupRotationMessage("Lineup and rotation saved to franchise team state.");
    } catch (err) {
      setLineupRotationError(err instanceof Error ? err.message : "Failed to save franchise lineup and rotation.");
    } finally {
      setIsLineupRotationSaving(false);
    }
  };

  const buildFranchiseOptimalSnapshot = (hand: OpposingPitcherHand) => {
    if (!franchiseTeam || !selectedTeamId) return null;

    return buildOptimalLineupSnapshot({
      teamId: selectedTeamId,
      mode: "franchise",
      instanceId: franchiseId,
      opposingPitcherHand: hand,
      candidates: franchiseRosterPlayers.map(toOptimalCandidate),
      playerStates: buildOptimalPlayerStates(franchiseRosterPlayers),
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "team_hub",
      sourceConfidence: "engine_calculated",
      rosterVersionId: franchiseTeam.lastModified,
    });
  };

  const buildCurrentFranchiseLineupSnapshot = (hand: OpposingPitcherHand) => {
    if (!franchiseTeam || !selectedTeamId) return null;
    const playerById = new Map(franchiseRosterPlayers.map((player) => [player.id, player]));

    return buildLineupSnapshotFromSlots({
      teamId: selectedTeamId,
      mode: "franchise",
      instanceId: franchiseId,
      opposingPitcherHand: hand,
      candidates: franchiseRosterPlayers.map(toOptimalCandidate),
      playerStates: buildOptimalPlayerStates(franchiseRosterPlayers),
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "user_registered_smb4_optimal",
      sourceConfidence: "user_registered",
      rosterVersionId: franchiseTeam.lastModified,
      slots: currentFranchiseLineup.map((slot) => {
        const player = playerById.get(slot.playerId);
        return {
          playerId: slot.playerId,
          playerName: player ? getFranchisePlayerName(player) : slot.playerId,
          battingOrderSlot: slot.battingOrder,
          defensivePosition: slot.fieldingPosition,
        };
      }),
    });
  };

  const buildCurrentFranchiseComparisonSnapshot = (hand: OpposingPitcherHand) => {
    if (!franchiseTeam || !selectedTeamId) return null;
    const playerById = new Map(franchiseRosterPlayers.map((player) => [player.id, player]));

    return buildLineupSnapshotFromSlots({
      teamId: selectedTeamId,
      mode: "franchise",
      instanceId: franchiseId,
      opposingPitcherHand: hand,
      candidates: franchiseRosterPlayers.map(toOptimalCandidate),
      playerStates: buildOptimalPlayerStates(franchiseRosterPlayers),
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "game_lock",
      sourceConfidence: "engine_calculated",
      rosterVersionId: franchiseTeam.lastModified,
      slots: currentFranchiseLineup.map((slot) => {
        const player = playerById.get(slot.playerId);
        return {
          playerId: slot.playerId,
          playerName: player ? getFranchisePlayerName(player) : slot.playerId,
          battingOrderSlot: slot.battingOrder,
          defensivePosition: slot.fieldingPosition,
        };
      }),
    });
  };

  const handleApplyFranchiseOptimal = async (hand: OpposingPitcherHand) => {
    if (!franchiseTeam) return;
    const field = optimalLineupField(hand, useDH);
    const storedSnapshot = franchiseTeam[field];
    const snapshot = storedSnapshot?.sourceConfidence === "stale_roster"
      ? buildFranchiseOptimalSnapshot(hand)
      : storedSnapshot ?? buildFranchiseOptimalSnapshot(hand);
    if (!snapshot) return;
    const officialSnapshot = isOfficialOptimalLineupSnapshot(snapshot)
      ? snapshot
      : confirmEngineOptimalLineupSnapshot(snapshot);
    const normalizedLineup = normalizeFranchiseLineupSlots(
      franchiseRosterPlayers,
      lineupSlotsFromOptimalSnapshot(officialSnapshot),
      useDH,
    );
    await saveFranchiseOptimalUpdate({
      [field]: officialSnapshot,
      [useDH ? "lineupWithDH" : "lineupWithoutDH"]: normalizedLineup,
    });
  };

  const handleRecalculateFranchiseOptimal = async (hand: OpposingPitcherHand) => {
    const snapshot = buildFranchiseOptimalSnapshot(hand);
    if (!snapshot) return;
    await saveFranchiseOptimalUpdate({
      [optimalLineupField(hand, useDH)]: confirmEngineOptimalLineupSnapshot(snapshot),
    });
  };

  const handleSetCurrentFranchiseOptimal = async (hand: OpposingPitcherHand) => {
    const snapshot = buildCurrentFranchiseLineupSnapshot(hand);
    if (!snapshot) return;
    await saveFranchiseOptimalUpdate({
      [optimalLineupField(hand, useDH)]: snapshot,
    });
  };

  const handleCompareFranchiseOptimal = (hand: OpposingPitcherHand) => {
    if (!franchiseTeam) return;
    const field = optimalLineupField(hand, useDH);
    const optimal = franchiseTeam[field] ?? buildFranchiseOptimalSnapshot(hand);
    const chosen = buildCurrentFranchiseComparisonSnapshot(hand);
    if (!optimal || !chosen) return;
    setLineupComparison({
      hand,
      comparison: summarizeLineupSnapshotComparison({ chosen, optimal }),
      sourceConfidence: optimal.sourceConfidence,
      generatedFallback: !franchiseTeam[field],
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-[#E8E8D8] text-xl">Loading team hub data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Hub Tabs */}
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] overflow-x-auto">
        <div className="flex">
          {[
            { id: "team", label: "TEAM SELECT" },
            { id: "fan-morale", label: "FAN MORALE" },
            { id: "roster", label: "ROSTER" },
            { id: "directory", label: "DIRECTORY" },
            { id: "stats", label: "STATS" },
            { id: "stadium", label: "STADIUM" },
            { id: "manager", label: "MANAGER" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveHubTab(tab.id as TeamHubTab)}
              className={`flex-1 px-3 py-2 text-[9px] whitespace-nowrap transition border-r-2 border-[#4A6844] last:border-r-0 ${
                activeHubTab === tab.id
                  ? "bg-[#4A6844] text-[#E8E8D8]"
                  : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Selection Tab */}
      {activeHubTab === "team" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
          <div className="text-center mb-6">
            <div
              className="text-[14px] text-[#E8E8D8] mb-2"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              SELECT A TEAM
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">Choose a team to view detailed information</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {teams.map((team) => (
              <button
                key={team}
                onClick={() => {
                  setSelectedTeam(team);
                  const idx = teams.indexOf(team);
                  if (idx >= 0 && stadiums[idx]) setSelectedStadium(stadiums[idx]);
                }}
                className={`p-4 transition border-[3px] ${
                  selectedTeam === team
                    ? "bg-[#4A6844] border-[#E8E8D8] text-[#E8E8D8]"
                    : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">{team}</div>
                <div className="text-[8px] mt-1">{getTeamRecord(team)}</div>
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div className="mt-6 p-4 bg-[#4A6844] border-[3px] border-[#3F5A3A] max-w-2xl mx-auto">
              <div className="text-[10px] text-[#E8E8D8] text-center">
                Currently viewing: <span className="font-bold">{selectedTeam}</span>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 text-center mt-1">
                Use the tabs above to explore team details
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fan Morale Tab */}
      {activeHubTab === "fan-morale" && (
        <FranchiseFanMoralePanel
          snapshots={moraleSnapshots}
          selectedTeamId={selectedTeamId}
          selectedTeamName={selectedTeam}
          isLoading={moraleLoading}
          error={moraleError}
          actionId={manualMoraleActionId}
          message={manualMoraleMessage}
          manualError={manualMoraleError}
          onApplyManualMorale={(targetId, delta, reason) =>
            void applyManualMoraleAdjustment({ targetType: 'team-fan', targetId, delta, reason })
          }
        />
      )}

      {/* Roster Tab */}
      {activeHubTab === "roster" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div
            className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {selectedTeam.toUpperCase()} ROSTER
          </div>

          <FranchiseRosterAnalyzerPanel report={analyzerReport} />

          <FranchiseTransactionHistoryPanel
            transactions={franchiseTransactionHistory}
            isLoading={transactionHistoryLoading}
            error={transactionHistoryError}
          />

          <FranchiseMode2FoundationStatusPanel
            selectedTeamId={selectedTeamId}
            selectedTeamName={selectedTeam}
            valueInputReport={valueInputReport}
            trueValuePreviewReport={trueValuePreviewReport}
            expectedWinsPreviewReport={expectedWinsPreviewReport}
            analyticsTrustReport={analyticsTrustReport}
            salaryLifecycleReport={salaryLifecycleReport}
            designationEligibilityReport={designationEligibilityReport}
            projectedDesignationRows={projectedDesignationRows}
            moraleRelationshipTrustReport={moraleRelationshipTrustReport}
            narrativeEventEligibilityReport={narrativeEventEligibilityReport}
            isLoading={valueTruthLoading || continuityLoading}
            error={valueTruthError ?? continuityError}
          />

          <FranchiseRandomEventLogPanel
            report={randomEventLogReport}
            records={randomEventRecords}
            selectedTeamId={selectedTeamId}
            selectedTeamName={selectedTeam}
            isLoading={valueTruthLoading || continuityLoading || randomEventLoading}
            error={valueTruthError ?? continuityError ?? randomEventError}
            actionId={randomEventActionId}
            onConfirm={confirmRandomEventRecord}
            onDismiss={dismissRandomEventRecord}
          />

          <FranchiseValueTruthPanel
            selectedTeamId={selectedTeamId}
            salaryLifecycleReport={salaryLifecycleReport}
            designationEligibilityReport={designationEligibilityReport}
            projectedDesignationRows={projectedDesignationRows}
            isLoading={valueTruthLoading}
            error={valueTruthError}
          />

          <section
            aria-label="Franchise lineup and rotation manager"
            className="mb-4 border-[4px] border-[#4A6844] bg-[#5A8352] p-3"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] text-[#C4A853]">DURABLE LINEUP + ROTATION</div>
                <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
                  Saves current franchise-owned MLB setup for GameTracker launch.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={rebuildManualLineupRotationFromMlb}
                  disabled={!franchiseTeam || isLineupRotationSaving}
                  className="border-2 border-[#E8E8D8]/30 bg-[#4A6844] px-3 py-1 text-[8px] font-bold text-[#E8E8D8] hover:border-[#C4A853] disabled:opacity-40"
                >
                  REBUILD FROM MLB ASSIGNMENTS
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveLineupRotation()}
                  disabled={!franchiseTeam || isLineupRotationSaving || Boolean(lineupRotationBlockingMessage)}
                  className="border-2 border-[#E8E8D8] bg-[#4A6844] px-3 py-1 text-[8px] font-bold text-[#E8E8D8] hover:border-[#C4A853] disabled:opacity-40"
                >
                  {isLineupRotationSaving ? "SAVING..." : "SAVE LINEUP + ROTATION"}
                </button>
              </div>
            </div>

            {storedLineupRotationWarnings.length > 0 && (
              <div className="mb-3 space-y-1 border-2 border-[#C4A853]/60 bg-[#4A6844] p-2 text-[8px] text-[#FFEFB5]">
                {storedLineupRotationWarnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}
            {lineupRotationBlockingMessage && (
              <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#4A6844] p-2 text-[8px] text-[#FFD6D6]">
                {lineupRotationBlockingMessage}
              </div>
            )}
            {lineupRotationError && (
              <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#4A6844] p-2 text-[8px] text-[#FFD6D6]">
                {lineupRotationError}
              </div>
            )}
            {lineupRotationMessage && (
              <div className="mb-3 border-2 border-[#E8E8D8]/30 bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]">
                {lineupRotationMessage}
              </div>
            )}

            <div className="mb-3 text-[8px] text-[#E8E8D8]/60">
              Status: {lineupRotationDirty ? "dirty / unsaved" : "saved"}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
              <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
                <div className="mb-2 text-[8px] font-bold text-[#C4A853]">
                  LINEUP ORDER ({useDH ? "DH" : "NO DH"})
                </div>
                {manualLineupSlots.length === 0 ? (
                  <div className="text-[8px] text-[#E8E8D8]/60">No current MLB position players available.</div>
                ) : (
                  <div className="space-y-2">
                    {manualLineupSlots.map((slot, index) => {
                      const player = franchiseRosterPlayerById.get(slot.playerId);
                      return (
                        <div key={`${slot.battingOrder}-${slot.playerId}-${index}`} className="grid grid-cols-[34px_minmax(150px,1fr)_80px_80px] items-center gap-2 text-[8px]">
                          <div className="text-[#E8E8D8]/70">#{index + 1}</div>
                          <select
                            aria-label={`Lineup slot ${index + 1} player`}
                            value={slot.playerId}
                            onChange={(event) => updateManualLineupSlot(index, { playerId: event.target.value })}
                            className="min-w-0 border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[#E8E8D8]"
                          >
                            {manualLineupPlayerOptions.map((optionPlayer) => (
                              <option key={optionPlayer.id} value={optionPlayer.id}>
                                {getFranchisePlayerName(optionPlayer)}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label={`Lineup slot ${index + 1} position`}
                            value={slot.fieldingPosition}
                            onChange={(event) => updateManualLineupSlot(index, { fieldingPosition: event.target.value as Position })}
                            className="border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[#E8E8D8]"
                          >
                            {manualFieldingPositionOptions.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Move lineup slot ${index + 1} up`}
                              disabled={index === 0}
                              onClick={() => moveManualLineupSlot(index, -1)}
                              className="flex-1 border border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[#E8E8D8] disabled:opacity-30"
                            >
                              UP
                            </button>
                            <button
                              type="button"
                              aria-label={`Move lineup slot ${index + 1} down`}
                              disabled={index === manualLineupSlots.length - 1}
                              onClick={() => moveManualLineupSlot(index, 1)}
                              className="flex-1 border border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[#E8E8D8] disabled:opacity-30"
                            >
                              DN
                            </button>
                          </div>
                          {!player && (
                            <div className="col-span-4 text-[#FFD6D6]">Selected player is no longer MLB-active for this team.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
                <div className="mb-2 text-[8px] font-bold text-[#C4A853]">STARTING ROTATION</div>
                {manualRotationIds.length === 0 ? (
                  <div className="text-[8px] text-[#E8E8D8]/60">No current MLB starters available.</div>
                ) : (
                  <div className="space-y-2">
                    {manualRotationIds.map((playerId, index) => {
                      const player = franchiseRosterPlayerById.get(playerId);
                      return (
                        <div key={`${playerId}-${index}`} className="grid grid-cols-[28px_minmax(120px,1fr)_70px] items-center gap-2 text-[8px]">
                          <div className="text-[#E8E8D8]/70">#{index + 1}</div>
                          <div className="text-[#E8E8D8]">
                            {player ? `${getFranchisePlayerName(player)} (${player.primaryPosition})` : playerId}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Move rotation pitcher ${index + 1} up`}
                              disabled={index === 0}
                              onClick={() => moveManualRotationSlot(index, -1)}
                              className="flex-1 border border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[#E8E8D8] disabled:opacity-30"
                            >
                              UP
                            </button>
                            <button
                              type="button"
                              aria-label={`Move rotation pitcher ${index + 1} down`}
                              disabled={index === manualRotationIds.length - 1}
                              onClick={() => moveManualRotationSlot(index, 1)}
                              className="flex-1 border border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[#E8E8D8] disabled:opacity-30"
                            >
                              DN
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {manualRotationPlayerOptions.length === 0 && (
                  <div className="mt-2 text-[8px] text-[#FFEFB5]">GameTracker will need a valid MLB pitcher before launch.</div>
                )}
              </div>
            </div>
          </section>

          <div className="mb-4 border-[4px] border-[#4A6844] bg-[#5A8352] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-[#C4A853]">OPTIMAL LINEUP BENCHMARKS</div>
                <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
                  {franchiseTeam ? "Franchise roster state" : "No franchise team record loaded"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLineupMode("DH");
                    setLineupComparison(null);
                  }}
                  className={`border-2 px-3 py-1 text-[8px] font-bold ${
                    lineupMode === "DH"
                      ? "border-[#E8E8D8] bg-[#4A6844] text-[#E8E8D8]"
                      : "border-[#4A6844] bg-[#6B9462] text-[#E8E8D8]/70"
                  }`}
                >
                  DH
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineupMode("NO_DH");
                    setLineupComparison(null);
                  }}
                  className={`border-2 px-3 py-1 text-[8px] font-bold ${
                    lineupMode === "NO_DH"
                      ? "border-[#E8E8D8] bg-[#4A6844] text-[#E8E8D8]"
                      : "border-[#4A6844] bg-[#6B9462] text-[#E8E8D8]/70"
                  }`}
                >
                  No DH
                </button>
              </div>
            </div>

            {optimalError && (
              <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#4A6844] p-2 text-[8px] text-[#FFD6D6]">
                {optimalError}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {(["R", "L"] as OpposingPitcherHand[]).map((hand) => {
                const field = optimalLineupField(hand, useDH);
                const snapshot = franchiseTeam?.[field];
                return (
                  <div key={hand} className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[8px] font-bold text-[#C4A853]">VS {hand}HP</span>
                      <span className="text-[7px] text-[#E8E8D8]/60">
                        {snapshot ? snapshot.sourceConfidence.replace(/_/g, " ") : "not set"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        disabled={!franchiseTeam || isOptimalSaving}
                        onClick={() => handleCompareFranchiseOptimal(hand)}
                        className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853] disabled:opacity-40"
                      >
                        COMPARE
                      </button>
                      <button
                        type="button"
                        disabled={!franchiseTeam || isOptimalSaving}
                        onClick={() => void handleApplyFranchiseOptimal(hand)}
                        className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853] disabled:opacity-40"
                      >
                        APPLY
                      </button>
                      <button
                        type="button"
                        disabled={!franchiseTeam || isOptimalSaving}
                        onClick={() => void handleRecalculateFranchiseOptimal(hand)}
                        className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853] disabled:opacity-40"
                      >
                        RECALC
                      </button>
                      <button
                        type="button"
                        disabled={!franchiseTeam || isOptimalSaving}
                        onClick={() => void handleSetCurrentFranchiseOptimal(hand)}
                        className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853] disabled:opacity-40"
                      >
                        SET
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {lineupComparison && (
              <OptimalLineupComparisonPanel
                hand={lineupComparison.hand}
                comparison={lineupComparison.comparison}
                sourceConfidence={lineupComparison.sourceConfidence}
                generatedFallback={lineupComparison.generatedFallback}
                onClose={() => setLineupComparison(null)}
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table aria-label="Franchise roster scan table" className="w-full min-w-[760px] text-[10px]">
              <thead>
                <tr className="border-b-2 border-[#4A6844]">
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("name")}>
                    NAME {rosterSortColumn === "name" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("position")}>
                    POS {rosterSortColumn === "position" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("rosterStatus")}>
                    STATUS {rosterSortColumn === "rosterStatus" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-right py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("salary")}>
                    SALARY {rosterSortColumn === "salary" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("morale")}>
                    MORALE {rosterSortColumn === "morale" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("stat")}>
                    STATS {rosterSortColumn === "stat" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("designation")}>
                    DESIGNATION {rosterSortColumn === "designation" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70">PROFILE</th>
                </tr>
              </thead>
              <tbody>
                {getSortedRoster().map((player, idx) => (
                  <tr key={player.playerId ?? idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? 'bg-[#5A8352]/20' : ''}`}>
                    <td className="py-2 px-2 text-[#E8E8D8]">
                      <button
                        type="button"
                        disabled={!player.playerId}
                        onClick={() => player.playerId && setSelectedProfilePlayerId(player.playerId)}
                        className="text-left font-bold text-[#E8E8D8] hover:text-[#C4A853] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {player.name}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.position}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">
                      <div className="font-bold">{player.rosterStatus}</div>
                      <div className="text-[8px] text-[#E8E8D8]/55">{player.teamContext || '—'}</div>
                    </td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-right">{player.contract}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={typeof player.morale === 'number' ? (player.morale >= 70 ? "text-[#00DD00]" : player.morale <= 35 ? "text-[#DD0000]" : "text-[#E8E8D8]") : "text-[#E8E8D8]/50"}>
                        {player.morale}
                      </span>
                      <div className="text-[8px] text-[#E8E8D8]/55">{player.moraleState}</div>
                    </td>
                    <td className={`py-2 px-2 text-left ${player.hiddenSafe ? 'text-[#E8E8D8]/60' : 'text-[#E8E8D8]'}`}>
                      {player.statSummary}
                    </td>
                    <td className={`py-2 px-2 text-left ${player.hiddenSafe ? 'text-[#E8E8D8]/60' : 'text-[#E8E8D8]'}`}>
                      {player.designationSummary}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        disabled={!player.playerId}
                        title="Open read-only franchise player profile."
                        aria-label={`${player.rosterStatus === 'FARM' ? 'Open roster scan profile' : 'Open profile'} for ${player.name}`}
                        onClick={() => player.playerId && setSelectedProfilePlayerId(player.playerId)}
                        className="p-1 hover:bg-[#4A6844] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <User className="w-3 h-3 text-[#E8E8D8]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FranchiseFarmVisibilityPanel
            farmPlayers={franchiseFarmPlayers}
            farmRecordByPlayerId={farmRecordByPlayerId}
            missingRecordPlayers={farmPlayersMissingRecords}
            orphanFarmRecords={orphanFarmRecords}
            onOpenProfile={setSelectedProfilePlayerId}
          />
        </div>
      )}

      {activeHubTab === "directory" && (
        <FranchisePlayerDirectoryPanel
          rows={franchiseDirectoryRows}
          totalCount={franchiseAllPlayers.length}
          teamOptions={franchiseTeamEntries.map(([teamId, teamName]) => ({ teamId, teamName }))}
          positionOptions={franchiseDirectoryPositionOptions}
          search={directorySearch}
          teamFilter={directoryTeamFilter}
          rosterFilter={directoryRosterFilter}
          positionFilter={directoryPositionFilter}
          revealFilter={directoryRevealFilter}
          sort={directorySort}
          onSearchChange={setDirectorySearch}
          onTeamFilterChange={setDirectoryTeamFilter}
          onRosterFilterChange={setDirectoryRosterFilter}
          onPositionFilterChange={setDirectoryPositionFilter}
          onRevealFilterChange={setDirectoryRevealFilter}
          onSortChange={setDirectorySort}
          onOpenProfile={setSelectedProfilePlayerId}
        />
      )}

      {/* Stats Tab */}
      {activeHubTab === "stats" && (
        <div className="space-y-4">
          {/* Stats View Toggle */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setStatsView("table")}
                className={`flex-1 py-2 px-3 text-[9px] transition ${
                  statsView === "table"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                STATS TABLE
              </button>
              <button
                disabled
                className={`flex-1 py-2 px-3 text-[9px] transition ${
                  statsView === "spraychart"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/40 cursor-not-allowed"
                }`}
              >
                SPRAY INSPECTOR IN STADIUM
              </button>
            </div>
          </div>

          {statsView === "table" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {selectedTeam.toUpperCase()} PLAYER STATS
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-[#4A6844]">
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("name")}>
                        NAME {statsSortColumn === "name" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">POS</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("war")}>
                        WAR {statsSortColumn === "war" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("pwar")}>
                        pWAR {statsSortColumn === "pwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("bwar")}>
                        bWAR {statsSortColumn === "bwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("rwar")}>
                        rWAR {statsSortColumn === "rwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("fwar")}>
                        fWAR {statsSortColumn === "fwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">PRIMARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedStats().map((player, idx) => (
                      <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? 'bg-[#5A8352]/20' : ''}`}>
                        <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pos}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.war.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.bwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.rwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.fwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]/50 text-center text-[8px]">
                          {player.pos === "SP" || player.pos === "RP"
                            ? (player.era != null ? `${player.era} ERA, ${player.k} K` : '—')
                            : (player.avg != null ? `${player.avg} AVG, ${player.hr} HR` : '—')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statsView === "spraychart" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8 text-center">
              <div className="text-[12px] text-[#E8E8D8]/50 mb-2">ROW EVIDENCE INSPECTOR AVAILABLE IN STADIUM TAB</div>
              <div className="text-[10px] text-[#E8E8D8]/40">
                Franchise v1 shows archive-backed spray rows in Team Hub Stadium. Full heat maps and stadium diagrams remain deferred.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stadiums Tab */}
      {activeHubTab === "stadium" && (
        <FranchiseStadiumFoundationPanel
          stadiums={stadiums}
          selectedStadium={selectedStadium}
          onSelectedStadiumChange={setSelectedStadium}
          report={stadiumFoundationReport}
          isLoading={continuityLoading}
          error={continuityError}
        />
      )}

      {/* Manager Tab */}
      {activeHubTab === "manager" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
          <div className="text-center">
            <User className="w-8 h-8 text-[#E8E8D8]/30 mx-auto mb-4" />
            <div className="text-[12px] text-[#E8E8D8]/50 mb-2">MANAGER</div>
            <div className="text-[10px] text-[#E8E8D8]/40">
              Manager Value is tracked from committed game decisions and appears in Game Detail, postgame summaries, and the Almanac.
            </div>
          </div>
        </div>
      )}

      {selectedProfile && (
        <FranchisePlayerProfileModal
          profile={selectedProfile}
          projectedDesignations={selectedProfileProjectedDesignations}
          continuity={selectedProfileContinuity}
          relationshipContext={selectedProfileRelationshipContext}
          continuityLoading={continuityLoading}
          continuityError={continuityError}
          moraleSnapshot={moraleSnapshots.find((snapshot) =>
            snapshot.targetType === 'player' && snapshot.playerId === selectedProfile.playerId,
          ) ?? null}
          franchiseId={franchiseId ?? ''}
          seasonId={seasonId}
          statsScopeId={seasonId}
          seasonNumber={seasonNumber}
          editForm={profileEditForm}
          editMode={profileEditMode}
          editErrors={profileEditErrors}
          editMessage={profileEditMessage}
          isSaving={isProfileSaving}
          moraleActionId={manualMoraleActionId}
          moraleMessage={manualMoraleMessage}
          moraleError={manualMoraleError}
          onApplyManualMorale={(targetId, delta, reason) =>
            void applyManualMoraleAdjustment({ targetType: 'player', targetId, delta, reason })
          }
          onClose={closeSelectedProfile}
          onStartEdit={startProfileEdit}
          onCancelEdit={cancelProfileEdit}
          onEditFormChange={setProfileEditForm}
          onSaveEdit={() => void handleSaveProfileEdit()}
        />
      )}
    </div>
  );
}

interface FranchiseRosterAnalyzerPanelProps {
  report: RosterAnalyzerReport | null;
}

interface FranchiseTransactionHistoryPanelProps {
  transactions: TransactionLogEntry[];
  isLoading: boolean;
  error: string | null;
}

interface FranchiseValueTruthPanelProps {
  selectedTeamId: string;
  salaryLifecycleReport: FranchiseSalaryLifecycleReport | null;
  designationEligibilityReport: FranchiseDesignationEligibilityReport | null;
  projectedDesignationRows: FranchisePlayerDesignationRecord[];
  isLoading: boolean;
  error: string | null;
}

interface FranchiseMode2FoundationStatusPanelProps {
  selectedTeamId: string;
  selectedTeamName: string;
  valueInputReport: FranchiseValueInputReport | null;
  trueValuePreviewReport: FranchiseTrueValuePreviewReport | null;
  expectedWinsPreviewReport: FranchiseExpectedWinsPreviewReport | null;
  analyticsTrustReport: FranchiseAnalyticsTrustReport | null;
  salaryLifecycleReport: FranchiseSalaryLifecycleReport | null;
  designationEligibilityReport: FranchiseDesignationEligibilityReport | null;
  projectedDesignationRows: FranchisePlayerDesignationRecord[];
  moraleRelationshipTrustReport: FranchiseMoraleRelationshipTrustReport | null;
  narrativeEventEligibilityReport: FranchiseNarrativeEventEligibilityReport | null;
  isLoading: boolean;
  error: string | null;
}

interface FranchiseStadiumFoundationPanelProps {
  stadiums: string[];
  selectedStadium: string;
  onSelectedStadiumChange: (stadium: string) => void;
  report: FranchiseStadiumFoundationReport | null;
  isLoading: boolean;
  error: string | null;
}

interface FranchiseRandomEventLogPanelProps {
  report: FranchiseRandomEventLogReport | null;
  records: FranchiseRandomEventLogRecord[];
  selectedTeamId: string;
  selectedTeamName: string;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  onConfirm: (recordId: string) => void;
  onDismiss: (recordId: string) => void;
}

interface FranchiseFanMoralePanelProps {
  snapshots: FranchiseMoraleSnapshot[];
  selectedTeamId: string;
  selectedTeamName: string;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  message: string | null;
  manualError: string | null;
  onApplyManualMorale: (targetId: string, delta: number, reason: string) => void;
}

interface FranchiseFarmVisibilityPanelProps {
  farmPlayers: Player[];
  farmRecordByPlayerId: Map<string, FranchiseFarmRecord>;
  missingRecordPlayers: Player[];
  orphanFarmRecords: FranchiseFarmRecord[];
  onOpenProfile: (playerId: string) => void;
}

interface FranchisePlayerDirectoryPanelProps {
  rows: FranchiseDirectoryRow[];
  totalCount: number;
  teamOptions: Array<{ teamId: string; teamName: string }>;
  positionOptions: string[];
  search: string;
  teamFilter: string;
  rosterFilter: FranchiseDirectoryRosterFilter;
  positionFilter: string;
  revealFilter: FranchiseDirectoryRevealFilter;
  sort: FranchiseDirectorySort;
  onSearchChange: (value: string) => void;
  onTeamFilterChange: (value: string) => void;
  onRosterFilterChange: (value: FranchiseDirectoryRosterFilter) => void;
  onPositionFilterChange: (value: string) => void;
  onRevealFilterChange: (value: FranchiseDirectoryRevealFilter) => void;
  onSortChange: (value: FranchiseDirectorySort) => void;
  onOpenProfile: (playerId: string) => void;
}

interface FranchisePlayerProfileModalProps {
  profile: FranchisePlayerProfileViewModel;
  projectedDesignations: FranchisePlayerDesignationRecord[];
  continuity: FranchisePlayerContinuityReport | null;
  relationshipContext: FranchiseRelationshipContextPreviewReport | null;
  continuityLoading: boolean;
  continuityError: string | null;
  moraleSnapshot: FranchiseMoraleSnapshot | null;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  editForm: FranchiseProfileEditForm | null;
  editMode: boolean;
  editErrors: string[];
  editMessage: string | null;
  isSaving: boolean;
  moraleActionId: string | null;
  moraleMessage: string | null;
  moraleError: string | null;
  onApplyManualMorale: (targetId: string, delta: number, reason: string) => void;
  onClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (form: FranchiseProfileEditForm) => void;
  onSaveEdit: () => void;
}

function formatProfileSalary(salary: number | null): string {
  if (salary == null || salary <= 0) return '—';
  return formatSalary(salary);
}

function formatProfileValue(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function canManuallyAdjustPlayerMorale(profile: FranchisePlayerProfileViewModel): boolean {
  return profile.revealState === 'revealed' && (profile.rosterStatus === 'MLB' || profile.rosterStatus === 'FARM');
}

function formatProfileHistoryDate(value?: string): string {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function FranchiseProfileField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <div className="text-[7px] font-bold text-[#C4A853]">{label}</div>
      <div className="mt-1 text-[9px] text-[#E8E8D8]">{formatProfileValue(value)}</div>
    </div>
  );
}

function parseManualMoraleDelta(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed === 0) return null;
  return parsed;
}

function FranchiseManualMoraleAdjustmentPanel({
  title,
  targetType,
  targetId,
  targetLabel,
  deltaLabel,
  reasonLabel,
  actionId,
  message,
  error,
  disabled,
  onApply,
}: {
  title: string;
  targetType: FranchiseMoraleTargetType;
  targetId: string;
  targetLabel: string;
  deltaLabel: string;
  reasonLabel: string;
  actionId: string | null;
  message: string | null;
  error: string | null;
  disabled?: boolean;
  onApply: (targetId: string, delta: number, reason: string) => void;
}) {
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  const parsedDelta = parseManualMoraleDelta(delta);
  const trimmedReason = reason.trim();
  const pending = actionId === `manual:${targetType}:${targetId}`;
  const blocked = disabled || pending || !targetId || parsedDelta == null || !trimmedReason;

  return (
    <section
      className="mt-3 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
      aria-label={`${title} manual adjustment`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold text-[#C4A853]">{title}</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Manual override only. Starts from canonical 50 baseline and writes scoped morale history; it does not edit profiles, relationships, salary, stories, or Mode 3.
          </div>
        </div>
        <FoundationStatusBadge status={disabled ? 'blocked' : 'ready-for-review'} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_auto]">
        <label className="block border-2 border-[#4A6844] bg-[#4A6844] p-2">
          <span className="block text-[9px] font-bold text-[#C4A853]">{deltaLabel}</span>
          <input
            aria-label={deltaLabel}
            type="number"
            step={1}
            value={delta}
            disabled={disabled || pending}
            onChange={(event) => setDelta(event.target.value)}
            className="mt-1 w-full border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[10px] text-[#E8E8D8]"
          />
        </label>
        <label className="block border-2 border-[#4A6844] bg-[#4A6844] p-2">
          <span className="block text-[9px] font-bold text-[#C4A853]">{reasonLabel}</span>
          <input
            aria-label={reasonLabel}
            value={reason}
            disabled={disabled || pending}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[10px] text-[#E8E8D8]"
          />
        </label>
        <button
          type="button"
          disabled={blocked}
          onClick={() => {
            if (parsedDelta == null || !trimmedReason) return;
            onApply(targetId, parsedDelta, trimmedReason);
            setReason('');
          }}
          className="border-2 border-[#C4A853] bg-[#6B9462] px-3 py-2 text-[10px] font-bold text-[#E8E8D8] hover:bg-[#5A8352] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'APPLYING...' : 'APPLY'}
        </button>
      </div>
      <div className="mt-2 text-[10px] leading-snug text-[#E8E8D8]/60">
        Target: {targetLabel}. Delta must be a non-zero whole number; storage clamps the final value to 0-99.
      </div>
      {message && (
        <div className="mt-2 border-2 border-[#9DFFB0]/40 bg-[#4A6844] p-2 text-[10px] text-[#9DFFB0]">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-2 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] text-[#FFD6D6]">
          {error}
        </div>
      )}
    </section>
  );
}

function FranchiseProfileEditHistoryPanel({
  entries,
}: {
  entries: FranchisePlayerProfileViewModel['editHistory'];
}) {
  return (
    <section className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
      <div className="text-[9px] font-bold text-[#C4A853]">PROFILE EDIT HISTORY</div>
      <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
        Latest 8 player-local profile changes only. Roster movement history remains separate.
      </div>
      {entries.length === 0 ? (
        <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/65">
          No player-local profile edits recorded.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map((entry, index) => (
            <div
              key={`${entry.date ?? 'unknown'}-${entry.field}-${index}`}
              className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#C4A853]">{entry.field}</span>
                <span className="text-[#E8E8D8]/55">{formatProfileHistoryDate(entry.date)}</span>
              </div>
              <div className="mt-1 text-[#E8E8D8]/75">
                {entry.oldValue} → {entry.newValue}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FranchisePlayerMoraleHistoryPanel({
  snapshot,
  playerId,
  playerName,
  canAdjust,
  actionId,
  message,
  error,
  onApplyManualMorale,
}: {
  snapshot: FranchiseMoraleSnapshot | null;
  playerId: string;
  playerName: string;
  canAdjust: boolean;
  actionId: string | null;
  message: string | null;
  error: string | null;
  onApplyManualMorale: (targetId: string, delta: number, reason: string) => void;
}) {
  const view = buildFranchisePlayerMoraleSpecViewModel({
    snapshot,
    fallbackPlayerId: playerId,
    fallbackPlayerName: playerName,
  });
  const implementedAreas = [
    view.implementationStatus.canonicalStorage,
    view.implementationStatus.confirmedEventEffects,
    view.implementationStatus.manualOverrides,
    view.implementationStatus.playerProfileDisplay,
    view.implementationStatus.neutralBaseline,
  ];
  const pendingAreas = [
    view.implementationStatus.personalityBaseline,
    view.implementationStatus.roleMorale,
    view.implementationStatus.relationshipEffects,
    view.implementationStatus.salarySatisfaction,
    view.implementationStatus.fanMoraleCoupling,
    view.implementationStatus.designationInputs,
    view.implementationStatus.performanceFormula,
    view.implementationStatus.ratingChangeSuggestions,
    view.implementationStatus.offseasonConsequences,
  ];

  return (
    <section
      className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
      aria-label="Player morale spec alignment"
    >
      <div className="text-[9px] font-bold text-[#C4A853]">PLAYER MORALE HISTORY</div>
      <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
        Canonical Franchise v1 player morale uses a neutral 50 baseline on a 0-99 scale. Relationship state, profile edits, salary, ratings, clutch, and Mode 3 remain separate.
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Current</div>
          <div className="mt-1 text-[24px] font-black leading-none">{view.currentValue}</div>
          <div className="mt-1">State: {view.state}</div>
          <div>Trend: {view.trend}</div>
          <div>Risk: {view.riskLevel}</div>
          <div>Previous: {view.previousValue ?? '—'}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/75">
          <div className="font-bold text-[#C4A853]">Implemented</div>
          <div className="mt-1 space-y-1">
            {implementedAreas.map((area) => (
              <div key={area.label}>{area.label}: {formatTruthStatus(area.status)}</div>
            ))}
          </div>
        </div>
        <div className="border-2 border-[#5A3F3F] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          <div className="font-bold text-[#FFEFB5]">Deferred / Blocked</div>
          <div className="mt-1 space-y-1">
            {pendingAreas.slice(0, 6).map((area) => (
              <div key={area.label}>{area.label}: {formatTruthStatus(area.status)}</div>
            ))}
          </div>
        </div>
      </div>

      {view.lastEvent ? (
        <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/70">
          Last event: {view.lastEvent.reason}
        </div>
      ) : (
        <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
          Neutral baseline. No confirmed or manual player morale changes recorded for this season.
        </div>
      )}

      {view.recentHistory.length > 0 && (
        <div className="mt-3 space-y-2">
          {view.recentHistory.map((entry) => (
            <div key={entry.id ?? `${entry.sourceEventId}-${entry.timestamp}`} className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#C4A853]">
                  {entry.previousValue} → {entry.currentValue} ({(entry.delta ?? 0) > 0 ? '+' : ''}{entry.delta ?? 0})
                </span>
                <span className="text-[#E8E8D8]/55">{formatProfileHistoryDate(entry.timestamp)}</span>
              </div>
              <div className="mt-1 text-[#E8E8D8]/75">{entry.reason}</div>
              <div className="mt-1 text-[#E8E8D8]/55">Source: {entry.sourceKind ?? 'unknown'}</div>
            </div>
          ))}
        </div>
      )}

      {canAdjust ? (
        <FranchiseManualMoraleAdjustmentPanel
          title="MANUAL PLAYER MORALE ADJUSTMENT"
          targetType="player"
          targetId={playerId}
          targetLabel={`${playerName} (${playerId})`}
          deltaLabel="Player morale delta"
          reasonLabel="Player morale reason"
          actionId={actionId}
          message={message}
          error={error}
          onApply={onApplyManualMorale}
        />
      ) : (
        <div className="mt-3 border-2 border-[#5A3F3F] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          Manual player morale controls are hidden until the player is revealed/current. Hidden FARM/prospect truth cannot drive morale changes.
        </div>
      )}
    </section>
  );
}

interface FranchiseManualOverridePreview {
  proposal: FranchiseMoraleRelationshipOverrideProposal;
  validation: FranchiseMoraleRelationshipOverrideValidationResult;
  hiddenTruthGuard?: FranchiseMoraleRelationshipOverrideValidationResult;
}

function buildManualOverridePreview(
  profile: FranchisePlayerProfileViewModel,
  context: {
    franchiseId: string;
    seasonId: string;
    statsScopeId: string;
    seasonNumber: number;
  },
): FranchiseManualOverridePreview {
  const proposal: FranchiseMoraleRelationshipOverrideProposal = {
    kind: 'player-morale',
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    statsScopeId: context.statsScopeId,
    seasonNumber: context.seasonNumber,
    actor: {
      actorType: 'user',
      actorId: 'internal-v1-preview',
      displayName: 'Internal v1 manual preview',
    },
    targetPlayerId: profile.playerId,
    targetTeamId: profile.teamId,
    overrideType: 'manual-player-context-preview',
    proposedEffect: {
      direction: 'context-only',
      magnitude: 'minor',
      summary: 'Preview-only context note; no morale or relationship state is created.',
    },
    reason: `Preview manual morale/relationship override shape for ${profile.identity.name}.`,
    evidenceReferences: profile.hiddenSafe
      ? [{
          type: 'scouting-report',
          context: 'prospect-visible',
          playerId: profile.playerId,
          teamId: profile.teamId,
          description: 'Visible scouting/profile context only; hidden prospect truth is not included.',
        }]
      : [{
          type: 'manual-note',
          context: 'player',
          playerId: profile.playerId,
          teamId: profile.teamId,
          description: 'Manual profile context preview only.',
        }],
    hiddenProspectSafety: {
      targetRosterStatus: profile.rosterStatus,
      targetRevealState: profile.revealState,
      includesHiddenTruthEvidence: false,
      hiddenFieldsReferenced: [],
    },
    approvalState: 'draft',
  };

  const validation = validateFranchiseMoraleRelationshipOverrideProposal(proposal);
  const hiddenTruthGuard = profile.hiddenSafe
    ? validateFranchiseMoraleRelationshipOverrideProposal({
        ...proposal,
        evidenceReferences: [{
          type: 'hidden-prospect-truth',
          context: 'hidden-truth',
          playerId: profile.playerId,
          teamId: profile.teamId,
          hiddenProspectTruth: true,
          hiddenFields: ['true ratings', 'true grade', 'hidden scout truth', 'hidden personality modifiers'],
          description: 'Blocked hidden prospect truth marker; no hidden values are rendered.',
        }],
        hiddenProspectSafety: {
          targetRosterStatus: profile.rosterStatus,
          targetRevealState: profile.revealState,
          includesHiddenTruthEvidence: true,
          hiddenFieldsReferenced: ['true ratings', 'true grade', 'hidden scout truth', 'hidden personality modifiers'],
        },
      })
    : undefined;

  return { proposal, validation, hiddenTruthGuard };
}

function ValidationLineList({
  label,
  entries,
  empty,
}: {
  label: string;
  entries: string[];
  empty: string;
}) {
  return (
    <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <div className="text-[9px] font-bold text-[#C4A853]">{label}</div>
      {entries.length === 0 ? (
        <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/55">{empty}</div>
      ) : (
        <div className="mt-2 space-y-1 text-[10px] leading-snug text-[#E8E8D8]/75">
          {entries.slice(0, 4).map((entry) => (
            <div key={entry}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function FranchiseManualOverridePreviewPanel({
  preview,
  playerName,
}: {
  preview: FranchiseManualOverridePreview;
  playerName: string;
}) {
  const { proposal, validation, hiddenTruthGuard } = preview;
  const targetId =
    proposal.kind === 'fanbase-team-relationship'
      ? proposal.targetTeamId
      : proposal.kind === 'scout-prospect-relationship'
        ? proposal.targetProspectPlayerId
        : proposal.targetPlayerId;
  return (
    <section
      role="region"
      aria-label="Manual Override Preview"
      className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">MANUAL OVERRIDE PREVIEW</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Draft-only validator preview. This creates no morale state, relationship state, approval record, or transaction.
          </div>
        </div>
        <span className={`border-2 px-2 py-1 text-[10px] font-bold ${foundationStatusClass(validation.status)}`}>
          {formatTruthStatus(validation.status)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FranchiseProfileField label="PROPOSAL KIND" value={proposal.kind} />
        <FranchiseProfileField label="TARGET PLAYER" value={`${playerName} (${targetId})`} />
        <FranchiseProfileField label="ACTOR / SOURCE" value={proposal.actor.displayName ?? proposal.actor.actorType} />
        <FranchiseProfileField label="PROPOSED EFFECT" value={`${proposal.proposedEffect.direction}: ${proposal.proposedEffect.summary}`} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <ValidationLineList
          label="REASONS"
          entries={validation.reasons}
          empty="No validator reasons returned."
        />
        <ValidationLineList
          label="WARNINGS"
          entries={validation.warnings}
          empty="No preview warnings."
        />
        <ValidationLineList
          label="BLOCKERS"
          entries={validation.blockers}
          empty="No draft blockers."
        />
      </div>

      <div className="mt-3">
        <ValidationLineList
          label="EVIDENCE"
          entries={proposal.evidenceReferences.map((reference) =>
            reference.description ?? `${reference.type}: ${reference.context}`,
          )}
          empty="No evidence references in this draft preview."
        />
      </div>

      {hiddenTruthGuard && (
        <div className="mt-3 border-2 border-[#5A3F3F] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          <div className="font-bold text-[#FFEFB5]">
            {`HIDDEN TRUTH EVIDENCE GUARD: ${formatTruthStatus(hiddenTruthGuard.status)}`}
          </div>
          <div className="mt-1">
            Hidden ratings, true grade, hidden scout truth, and hidden personality modifiers are blocked as evidence.
          </div>
          {hiddenTruthGuard.blockers.slice(0, 2).map((blocker) => (
            <div key={blocker} className="mt-1">{blocker}</div>
          ))}
        </div>
      )}
    </section>
  );
}

function FranchiseRelationshipContextPanel({
  report,
}: {
  report: FranchiseRelationshipContextPreviewReport | null;
}) {
  return (
    <section
      role="region"
      aria-label="Relationship Context"
      className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">RELATIONSHIP CONTEXT</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Read-only / draft-only proposal context. No durable relationship state exists in Franchise v1.
          </div>
        </div>
        <FoundationStatusBadge status="blocked" />
      </div>

      {!report ? (
        <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
          Relationship context is unavailable until franchise scope and player profile data are loaded.
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {report.rows.map((row) => (
              <div key={row.kind} className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#C4A853]">{row.label}</span>
                  <FoundationStatusBadge status={row.status} />
                </div>
                <div className="mt-2 text-[#E8E8D8]/70">
                  {row.proposal?.kind ?? row.kind}. Context only; no save, confirm, apply, or relationship effect.
                </div>
                {row.evidenceDescriptions.slice(0, 2).map((description) => (
                  <div key={description} className="mt-1 text-[#E8E8D8]/60">{description}</div>
                ))}
                {row.blockers.slice(0, 2).map((blocker) => (
                  <div key={blocker} className="mt-1 text-[#FFD6D6]">{blocker}</div>
                ))}
                {row.warnings.slice(0, 2).map((warning) => (
                  <div key={warning} className="mt-1 text-[#FFD27A]">{warning}</div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ValidationLineList
              label="EVIDENCE POLICY"
              entries={report.evidencePolicy}
              empty="No evidence policy returned."
            />
            <ValidationLineList
              label="BLOCKERS / LIMITATIONS"
              entries={report.limitations}
              empty="No relationship-context limitations returned."
            />
          </div>

          {report.hiddenTruthGuard && (
            <div className="mt-3 border-2 border-[#5A3F3F] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
              <div className="font-bold text-[#FFEFB5]">
                {`HIDDEN TRUTH RELATIONSHIP GUARD: ${formatTruthStatus(report.hiddenTruthGuard.status)}`}
              </div>
              <div className="mt-1">
                Hidden FARM/prospect truth is blocked from relationship evidence and proposal context.
              </div>
              {report.hiddenTruthGuard.blockers.slice(0, 2).map((blocker) => (
                <div key={blocker} className="mt-1">{blocker}</div>
              ))}
            </div>
          )}

          <div className="mt-3 border-2 border-[#5A3F3F] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
            Relationship mutation, morale mutation from relationships, profile automation, salary movement, designation mutation, story persistence, offseason, and Mode 3 remain blocked.
          </div>
        </>
      )}
    </section>
  );
}

function formatContinuityDate(value?: number | string): string {
  if (value == null || value === '') return 'Date unavailable';
  const parsed = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
}

function ContinuityMiniList({
  title,
  entries,
  empty,
}: {
  title: string;
  entries: string[];
  empty: string;
}) {
  return (
    <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <div className="text-[7px] font-bold text-[#C4A853]">{title}</div>
      {entries.length === 0 ? (
        <div className="mt-1 text-[8px] text-[#E8E8D8]/55">{empty}</div>
      ) : (
        <div className="mt-2 space-y-1 text-[8px] text-[#E8E8D8]/75">
          {entries.slice(0, 4).map((entry, index) => (
            <div key={`${title}-${index}`}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function FranchisePlayerContinuityPanel({
  report,
  isLoading,
  error,
}: {
  report: FranchisePlayerContinuityReport | null;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
      <div className="text-[9px] font-bold text-[#C4A853]">PLAYER CONTINUITY</div>
      <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
        Read-only playerId projection. Profile edits stay player-local; roster transactions, archive-backed games, score-only team results, and team stints remain separate evidence.
      </div>
      {isLoading && (
        <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/65">
          Loading player continuity...
        </div>
      )}
      {error && (
        <div className="mt-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
          {error}
        </div>
      )}
      {!isLoading && !error && report && (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ContinuityMiniList
              title="PROFILE EDITS"
              empty="No player-local profile edits in this projection."
              entries={report.profileEdits.map((entry) =>
                `${entry.field}: ${entry.oldValue} → ${entry.newValue}${entry.date ? ` (${formatContinuityDate(entry.date)})` : ''}`,
              )}
            />
            <ContinuityMiniList
              title="ROSTER EVENTS"
              empty="No scoped roster transactions for this player."
              entries={report.rosterTransactions.map((entry) =>
                `${entry.transactionType}: ${entry.sourceTeamId ?? entry.teamId ?? 'UNKNOWN'} → ${entry.targetTeamId ?? entry.teamId ?? 'UNKNOWN'}${entry.targetRosterStatus ? ` (${entry.targetRosterStatus})` : ''}`,
              )}
            />
            <ContinuityMiniList
              title="GAME / STAT EVIDENCE"
              empty="No archive-backed GameTracker evidence for this player."
              entries={report.gameEvidence.map((entry) =>
                `${entry.gameLogId}: ${entry.teamId ?? 'UNKNOWN'} vs ${entry.opponentTeamId ?? 'UNKNOWN'} (${entry.competitionType ?? 'game'})`,
              )}
            />
            <ContinuityMiniList
              title="SCORE-ONLY TEAM RESULTS"
              empty="No score-only team-result rows tied to known player teams."
              entries={report.scoreOnlyResults.map((entry) =>
                `Game ${entry.gameNumber}: ${entry.awayTeamId} ${entry.awayScore ?? '—'} @ ${entry.homeTeamId} ${entry.homeScore ?? '—'}; no player archive/player stats.`,
              )}
            />
            <ContinuityMiniList
              title="TEAM STINTS"
              empty="No archive-derived team stints for this player."
              entries={report.teamStints.map((entry) =>
                `${entry.teamId}: ${entry.games} game${entry.games === 1 ? '' : 's'} (${entry.gameIds.join(', ')})`,
              )}
            />
            <ContinuityMiniList
              title="KNOWN TEAMS"
              empty="No team context beyond current assignment."
              entries={report.knownTeamIds.map((teamId) => teamId)}
            />
          </div>
          {report.limitations.length > 0 && (
            <div className="mt-3 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/60">
              {report.limitations.slice(0, 3).map((limitation) => (
                <div key={limitation}>{limitation}</div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ProfileTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <span className="block text-[7px] font-bold text-[#C4A853]">{label}</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[9px] text-[#E8E8D8]"
      />
    </label>
  );
}

function ProfileSelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  includeBlank,
}: {
  label: string;
  value: T | '';
  options: readonly T[];
  onChange: (value: T | '') => void;
  includeBlank?: boolean;
}) {
  return (
    <label className="block border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <span className="block text-[7px] font-bold text-[#C4A853]">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T | '')}
        className="mt-1 w-full border-2 border-[#3F5A3A] bg-[#5A8352] p-1 text-[9px] text-[#E8E8D8]"
      >
        {includeBlank && <option value="">—</option>}
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FranchisePlayerProfileModal({
  profile,
  projectedDesignations,
  continuity,
  relationshipContext,
  continuityLoading,
  continuityError,
  moraleSnapshot,
  franchiseId,
  seasonId,
  statsScopeId,
  seasonNumber,
  editForm,
  editMode,
  editErrors,
  editMessage,
  isSaving,
  moraleActionId,
  moraleMessage,
  moraleError,
  onApplyManualMorale,
  onClose,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onSaveEdit,
}: FranchisePlayerProfileModalProps) {
  const traits = profile.identity.traits.length > 0 ? profile.identity.traits.join(', ') : 'None';
  const manualOverridePreview = useMemo(() => buildManualOverridePreview(profile, {
    franchiseId,
    seasonId,
    statsScopeId,
    seasonNumber,
  }), [franchiseId, profile, seasonId, seasonNumber, statsScopeId]);
  const form = editForm;
  const pitchingModelAvailable = form
    ? playerHasFranchisePitchingModel({ primaryPosition: form.primaryPosition })
    : Boolean(profile.fullDetails?.pitchingModelAvailable);
  const updateForm = (update: Partial<FranchiseProfileEditForm>) => {
    if (!form) return;
    onEditFormChange({ ...form, ...update });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Franchise player profile for ${profile.identity.name}`}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-[5px] border-[#4A6844] bg-[#6B9462] p-4 text-[#E8E8D8] shadow-[8px_8px_0px_rgba(0,0,0,0.35)]"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#4A6844] pb-3">
          <div>
            <div className="text-[8px] font-bold text-[#C4A853]">FRANCHISE PLAYER PROFILE</div>
            <div className="mt-1 text-[14px] font-bold">{profile.identity.name}</div>
            <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
              {profile.rosterStatus} · {String(profile.revealState).toUpperCase()} · {editMode ? 'Manual edit' : 'Read-only'}
            </div>
            {profile.hiddenSafe && (
              <div className="mt-1 text-[8px] text-[#FFEFB5]">
                Limited edit: visible identity only. Ratings and hidden prospect truth stay blocked.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="border-2 border-[#E8E8D8]/40 bg-[#4A6844] px-3 py-1 text-[8px] font-bold hover:border-[#C4A853] disabled:opacity-40"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={isSaving || !form}
                  className="border-2 border-[#E8E8D8] bg-[#4A6844] px-3 py-1 text-[8px] font-bold hover:border-[#C4A853] disabled:opacity-40"
                >
                  {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartEdit}
                className="border-2 border-[#E8E8D8] bg-[#4A6844] px-3 py-1 text-[8px] font-bold hover:border-[#C4A853]"
              >
                {profile.hiddenSafe ? 'LIMITED EDIT' : 'EDIT PROFILE'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="border-2 border-[#E8E8D8]/40 bg-[#4A6844] px-3 py-1 text-[8px] font-bold hover:border-[#C4A853] disabled:opacity-40"
            >
              CLOSE
            </button>
          </div>
        </div>

        {editErrors.length > 0 && (
          <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
            {editErrors.map((error) => <div key={error}>{error}</div>)}
          </div>
        )}
        {editMessage && (
          <div className="mb-3 border-2 border-[#E8E8D8]/30 bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]">
            {editMessage}
          </div>
        )}

        {projectedDesignations.length > 0 && (
          <section className="mb-3 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
            <div className="text-[9px] font-bold text-[#C4A853]">PROJECTED DESIGNATIONS</div>
            <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
              Solid badges are live TEAM_MVP/ACE designations. Dotted Proj. badges are mid-season projections. Season-end locking, morale, salary, awards, and Mode 3 effects remain blocked.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {projectedDesignations.map((designation) => {
                const badge = designation.status === 'active'
                  ? (getLiveDesignationBadge(designation.type) ?? getProjectedDesignationBadge(designation.type))
                  : getProjectedDesignationBadge(designation.type);
                return (
                <span
                  key={`${designation.type}:${designation.teamId}:${designation.calculatedAt}`}
                  className="border-2 bg-[#4A6844] px-2 py-1 text-[8px] font-bold"
                  style={{
                    borderColor: badge.colorHex,
                    borderStyle: badge.borderStyle,
                    color: badge.colorHex,
                    backgroundColor: badge.backgroundHex,
                  }}
                >
                  {badge.label}
                </span>
                );
              })}
            </div>
          </section>
        )}

        {editMode && form ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileTextInput label="FIRST NAME" value={form.firstName} onChange={(firstName) => updateForm({ firstName })} />
            <ProfileTextInput label="LAST NAME" value={form.lastName} onChange={(lastName) => updateForm({ lastName })} />
            <ProfileTextInput label="NICKNAME" value={form.nickname} onChange={(nickname) => updateForm({ nickname })} />
            <ProfileTextInput label="AGE" value={form.age} onChange={(age) => updateForm({ age })} />
            <ProfileSelectInput label="BATS" value={form.bats} options={['L', 'R', 'S'] as const} onChange={(bats) => bats && updateForm({ bats })} />
            <ProfileSelectInput label="THROWS" value={form.throws} options={['L', 'R'] as const} onChange={(throws) => throws && updateForm({ throws })} />
            <ProfileSelectInput label="PRIMARY POSITION" value={form.primaryPosition} options={FRANCHISE_PROFILE_PRIMARY_POSITIONS} onChange={(primaryPosition) => primaryPosition && updateForm({ primaryPosition })} />
            <ProfileSelectInput label="SECONDARY POSITION" value={form.secondaryPosition} options={FRANCHISE_PROFILE_SECONDARY_POSITIONS} includeBlank onChange={(secondaryPosition) => updateForm({ secondaryPosition })} />
            <ProfileTextInput label="TRAIT 1" value={form.trait1} onChange={(trait1) => updateForm({ trait1 })} />
            <ProfileTextInput label="TRAIT 2" value={form.trait2} onChange={(trait2) => updateForm({ trait2 })} />
            <ProfileSelectInput label="PERSONALITY" value={form.personality} options={FRANCHISE_PROFILE_PERSONALITIES} onChange={(personality) => personality && updateForm({ personality })} />
            <ProfileSelectInput label="CHEMISTRY" value={form.chemistry} options={FRANCHISE_PROFILE_CHEMISTRIES} onChange={(chemistry) => chemistry && updateForm({ chemistry })} />
            <FranchiseProfileField label="SALARY BASELINE" value={formatProfileSalary(profile.salary)} />
            <FranchiseProfileField label="CONTRACT YEARS" value={profile.contractYears ?? '—'} />
            <FranchiseProfileField label="TEAM / STATUS" value={`${profile.teamId ?? 'UNKNOWN'} / ${profile.rosterStatus}`} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FranchiseProfileField label="AGE" value={profile.identity.age} />
            <FranchiseProfileField label="BATS / THROWS" value={`${profile.identity.bats} / ${profile.identity.throws}`} />
            <FranchiseProfileField label="PRIMARY POSITION" value={profile.identity.primaryPosition} />
            <FranchiseProfileField label="SECONDARY POSITION" value={profile.identity.secondaryPosition ?? '—'} />
            <FranchiseProfileField label="TRAITS" value={traits} />
            <FranchiseProfileField label="PERSONALITY" value={profile.identity.personality} />
            <FranchiseProfileField label="CHEMISTRY" value={profile.identity.chemistry} />
            <FranchiseProfileField label="SALARY BASELINE" value={formatProfileSalary(profile.salary)} />
            <FranchiseProfileField label="CONTRACT YEARS" value={profile.contractYears ?? '—'} />
            <FranchiseProfileField label="TEAM / STATUS" value={`${profile.teamId ?? 'UNKNOWN'} / ${profile.rosterStatus}`} />
          </div>
        )}

        {profile.hiddenSafe ? (
          <section className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
            <div className="text-[9px] font-bold text-[#C4A853]">VISIBLE SCOUTING REPORT</div>
            <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
              Hidden prospect details stay unavailable until call-up or reveal.
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FranchiseProfileField label="SCOUTED GRADE" value={profile.prospectReport.scoutedGrade ?? 'Unscouted'} />
              <FranchiseProfileField label="POTENTIAL" value={profile.prospectReport.potentialGrade ?? 'Unknown'} />
              <FranchiseProfileField label="CONFIDENCE" value={profile.prospectReport.scoutConfidence ?? 'Unknown'} />
              <FranchiseProfileField label="SCOUT" value={profile.prospectReport.scoutName ?? '—'} />
              <FranchiseProfileField label="SOURCE" value={profile.prospectReport.source ?? 'Unknown'} />
              <FranchiseProfileField
                label="DRAFT"
                value={[
                  profile.prospectReport.draftYear ? `Year ${profile.prospectReport.draftYear}` : null,
                  profile.prospectReport.draftRound ? `Round ${profile.prospectReport.draftRound}` : null,
                  profile.prospectReport.draftPick ? `Pick ${profile.prospectReport.draftPick}` : null,
                ].filter(Boolean).join(' · ') || '—'}
              />
              <FranchiseProfileField label="OPTIONS USED" value={profile.farm.optionsUsed ?? '—'} />
              <FranchiseProfileField label="OPTION DATES" value={profile.farm.optionDates.length > 0 ? profile.farm.optionDates.map((date) => date.slice(0, 10)).join(', ') : 'None'} />
            </div>
          </section>
        ) : (
          <section className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
            <div className="text-[9px] font-bold text-[#C4A853]">BASEBALL DETAILS</div>
            {editMode && form ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileSelectInput label="GRADE" value={form.overallGrade} options={FRANCHISE_PROFILE_GRADES} onChange={(overallGrade) => overallGrade && updateForm({ overallGrade })} />
                <ProfileTextInput label="POW" value={form.power} onChange={(power) => updateForm({ power })} />
                <ProfileTextInput label="CON" value={form.contact} onChange={(contact) => updateForm({ contact })} />
                <ProfileTextInput label="SPD" value={form.speed} onChange={(speed) => updateForm({ speed })} />
                <ProfileTextInput label="FLD" value={form.fielding} onChange={(fielding) => updateForm({ fielding })} />
                <ProfileTextInput label="ARM" value={form.arm} onChange={(arm) => updateForm({ arm })} />
                {pitchingModelAvailable ? (
                  <>
                    <ProfileTextInput label="VEL" value={form.velocity} onChange={(velocity) => updateForm({ velocity })} />
                    <ProfileTextInput label="JNK" value={form.junk} onChange={(junk) => updateForm({ junk })} />
                    <ProfileTextInput label="ACC" value={form.accuracy} onChange={(accuracy) => updateForm({ accuracy })} />
                    <ProfileTextInput label={`ARSENAL (${FRANCHISE_PROFILE_PITCH_TYPES.join(', ')})`} value={form.arsenal} onChange={(arsenal) => updateForm({ arsenal })} />
                  </>
                ) : (
                  <div className="border-2 border-[#E8E8D8]/15 bg-[#2d3d2f] p-2 text-[8px] text-[#E8E8D8]/70 sm:col-span-2 lg:col-span-3">
                    Pitching ratings hidden for non-pitcher / non-TWO-WAY profile.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FranchiseProfileField label="ANALYZER GRADE" value={profile.fullDetails?.ratingModelGrade ?? '—'} />
                <FranchiseProfileField label="STORED GRADE" value={profile.fullDetails?.storedOverallGrade ?? '—'} />
                <FranchiseProfileField label="POW" value={profile.fullDetails?.power ?? '—'} />
                <FranchiseProfileField label="CON" value={profile.fullDetails?.contact ?? '—'} />
                <FranchiseProfileField label="SPD" value={profile.fullDetails?.speed ?? '—'} />
                <FranchiseProfileField label="FLD" value={profile.fullDetails?.fielding ?? '—'} />
                <FranchiseProfileField label="ARM" value={profile.fullDetails?.arm ?? '—'} />
                {profile.fullDetails?.pitchingRatings ? (
                  <>
                    <FranchiseProfileField label="VEL" value={profile.fullDetails.pitchingRatings.velocity} />
                    <FranchiseProfileField label="JNK" value={profile.fullDetails.pitchingRatings.junk} />
                    <FranchiseProfileField label="ACC" value={profile.fullDetails.pitchingRatings.accuracy} />
                    <FranchiseProfileField label="ARSENAL" value={profile.fullDetails.pitchingRatings.arsenal.length ? profile.fullDetails.pitchingRatings.arsenal.join(', ') : '—'} />
                  </>
                ) : (
                  <div className="border-2 border-[#E8E8D8]/15 bg-[#2d3d2f] p-2 text-[8px] text-[#E8E8D8]/70 sm:col-span-2 lg:col-span-3">
                    Pitching ratings hidden for non-pitcher / non-TWO-WAY profile.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <FranchiseProfileEditHistoryPanel entries={profile.editHistory} />
        <FranchisePlayerMoraleHistoryPanel
          snapshot={moraleSnapshot}
          playerId={profile.playerId}
          playerName={profile.identity.name}
          canAdjust={canManuallyAdjustPlayerMorale(profile)}
          actionId={moraleActionId}
          message={moraleMessage}
          error={moraleError}
          onApplyManualMorale={onApplyManualMorale}
        />
        <FranchiseManualOverridePreviewPanel
          preview={manualOverridePreview}
          playerName={profile.identity.name}
        />
        <FranchiseRelationshipContextPanel report={relationshipContext} />
        <FranchisePlayerContinuityPanel
          report={continuity}
          isLoading={continuityLoading}
          error={continuityError}
        />
      </div>
    </div>
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatTruthStatus(status: string): string {
  return status.replace(/-/g, ' ').toUpperCase();
}

function formatPreviewNumber(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function foundationStatusClass(status: string): string {
  if (status === 'trusted' || status === 'active' || status === 'eligible-context' || status === 'stable-baseline' || status === 'valid-draft' || status === 'confirmed-manual-change') {
    return 'border-[#9DFFB0]/60 text-[#9DFFB0]';
  }
  if (status === 'preview-only' || status === 'partial' || status === 'needs-approval' || status === 'ready-for-review') return 'border-[#FFD27A]/60 text-[#FFD27A]';
  if (status === 'deferred' || status === 'not-applicable') return 'border-[#E8E8D8]/35 text-[#E8E8D8]/75';
  if (status === 'dismissed') return 'border-[#E8E8D8]/25 text-[#E8E8D8]/45';
  return 'border-[#FFD6D6]/60 text-[#FFD6D6]';
}

function FoundationStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex border-2 px-2 py-0.5 text-[9px] font-bold ${foundationStatusClass(status)}`}>
      {formatTruthStatus(status)}
    </span>
  );
}

function FoundationStatusCard({
  title,
  status,
  body,
}: {
  title: string;
  status: string;
  body: string;
}) {
  return (
    <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[9px] font-bold text-[#C4A853]">{title}</div>
        <FoundationStatusBadge status={status} />
      </div>
      <div className="text-[10px] leading-snug text-[#E8E8D8]/75">{body}</div>
    </div>
  );
}

function FranchiseValueExpectedWinsPreviewPanel({
  selectedTeamId,
  selectedTeamName,
  trueValuePreviewReport,
  expectedWinsPreviewReport,
  salaryLifecycleReport,
  isLoading,
}: {
  selectedTeamId: string;
  selectedTeamName: string;
  trueValuePreviewReport: FranchiseTrueValuePreviewReport | null;
  expectedWinsPreviewReport: FranchiseExpectedWinsPreviewReport | null;
  salaryLifecycleReport: FranchiseSalaryLifecycleReport | null;
  isLoading: boolean;
}) {
  const teamSummary = trueValuePreviewReport?.teamSummaries.find((summary) => summary.teamId === selectedTeamId) ?? null;
  const expectedWinsRow = expectedWinsPreviewReport?.teamRows.find((row) => row.teamId === selectedTeamId) ?? null;
  const teamPayrollRecord = salaryLifecycleReport?.teamRecords.find((record) => record.teamId === selectedTeamId) ?? null;
  const selectedSalaryRecords = (salaryLifecycleReport?.playerRecords ?? []).filter((record) => record.teamId === selectedTeamId);
  const stableSalaryBaselineCount = selectedSalaryRecords.filter((record) => record.initialSalaryBaseline.status === 'stable-baseline').length;
  const contractYearsProofCount = selectedSalaryRecords.filter((record) =>
    Number.isFinite(record.contractYears) && Number(record.contractYears) > 0,
  ).length;
  const missingContractYearsCount = selectedSalaryRecords.length - contractYearsProofCount;
  const rosterSalarySum = selectedSalaryRecords.reduce((sum, record) =>
    typeof record.salary === 'number' && Number.isFinite(record.salary) ? sum + record.salary : sum,
  0);
  const payrollBaseline = teamPayrollRecord?.payrollBaseline ?? null;
  const payrollMatchesRoster = payrollBaseline !== null && rosterSalarySum > 0
    ? Math.abs(payrollBaseline - rosterSalarySum) < 0.001
    : false;
  const blockers = expectedWinsRow?.blockers ?? [];
  const salaryBlockers = [
    ...(stableSalaryBaselineCount < selectedSalaryRecords.length
      ? [`${selectedSalaryRecords.length - stableSalaryBaselineCount} selected-team player salary baseline(s) missing.`]
      : []),
    ...(missingContractYearsCount > 0
      ? [`Contract years missing for ${missingContractYearsCount} salary row${missingContractYearsCount === 1 ? '' : 's'}.`]
      : []),
    ...(teamPayrollRecord?.payrollBaselineState.status === 'blocked' || payrollBaseline === null
      ? ['Team payroll proof is missing for this selected team.']
      : []),
  ];
  const isAvailable = Boolean(teamSummary && expectedWinsRow && expectedWinsRow.status === 'preview-only');
  const valueDelta = teamSummary?.valueDeltaEstimateTotal ?? expectedWinsRow?.previewGapFromLeagueAverage ?? null;

  return (
    <section
      role="region"
      aria-label="Team True Value and Expected Wins Preview"
      className="mt-3 border-[4px] border-[#4A6844] bg-[#5A8352] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold text-[#C4A853]">TRUE VALUE + EXPECTED WINS PREVIEW</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="border border-[#FFD27A]/50 bg-[#5A5130] px-2 py-0.5 text-[8px] font-bold text-[#FFEFB5]">
              PREVIEW ONLY
            </span>
            <span className="border border-[#E8E8D8]/25 bg-[#4A6844] px-2 py-0.5 text-[8px] font-bold text-[#E8E8D8]/75">
              CURRENT SALARY CONTEXT
            </span>
            <span className="border border-[#E8E8D8]/25 bg-[#3F563F] px-2 py-0.5 text-[8px] font-bold text-[#E8E8D8]/75">
              READ ONLY
            </span>
            <span className="border border-[#DD0000]/35 bg-[#5A3F3F] px-2 py-0.5 text-[8px] font-bold text-[#FFD6D6]">
              NO SALARY MOVEMENT
            </span>
          </div>
        </div>
        <FoundationStatusBadge status={isAvailable ? 'preview-only' : 'blocked'} />
      </div>

      <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Team payroll proof</div>
          <div className="mt-1">{formatRosterSalary(payrollBaseline)}</div>
          <div className="text-[8px] text-[#E8E8D8]/55">{teamPayrollRecord ? formatTruthStatus(teamPayrollRecord.payrollBaselineState.status) : 'BLOCKED'}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Roster salary sum</div>
          <div className="mt-1">{rosterSalarySum > 0 ? formatRosterSalary(rosterSalarySum) : '—'}</div>
          <div className="text-[8px] text-[#E8E8D8]/55">{payrollMatchesRoster ? 'MATCHES PAYROLL BASELINE' : 'READ-ONLY CROSS-CHECK'}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Current salary rows</div>
          <div className="mt-1">{stableSalaryBaselineCount}/{selectedSalaryRecords.length}</div>
          <div className="text-[8px] text-[#E8E8D8]/55">Selected-team salary rows</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Contract years proof</div>
          <div className="mt-1">{contractYearsProofCount}/{selectedSalaryRecords.length}</div>
          <div className="text-[8px] text-[#E8E8D8]/55">Separate from salary baseline stability</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Salary movement</div>
          <div className="mt-1">Blocked</div>
          <div className="text-[8px] text-[#E8E8D8]/55">No final True Value or offseason mutation</div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Team</div>
          <div className="mt-1">{selectedTeamName || selectedTeamId || 'No team selected'}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Team salary total</div>
          <div className="mt-1">{formatPreviewNumber(teamSummary?.salaryTotal)}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Preview value total</div>
          <div className="mt-1">{formatPreviewNumber(teamSummary?.previewValueEstimateTotal)}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Preview value delta</div>
          <div className="mt-1">{formatPreviewNumber(valueDelta)}</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Expected wins estimate</div>
          <div className="mt-1">{formatPreviewNumber(expectedWinsRow?.expectedWinsEstimate)}</div>
        </div>
      </div>

      <div className="mt-2 border-2 border-[#4A6844] bg-[#3F563F] p-2 text-[10px] leading-snug text-[#E8E8D8]/70">
        <div>League average preview value baseline: {formatPreviewNumber(expectedWinsPreviewReport?.leagueAveragePreviewValueBaseline)}</div>
        <div>Blocked: expected-wins persistence, final designations, salary movement, morale/relationship mutation, offseason, Mode 3.</div>
        {salaryBlockers.length > 0 && (
          <div className="mt-2 text-[#FFEFB5]">
            Salary blocker: {salaryBlockers.join(' ')}
          </div>
        )}
        {!isAvailable && (
          <div className="mt-2 text-[#FFD6D6]">
            {isLoading
              ? 'Loading preview contracts.'
              : blockers.length > 0
                ? `Blocked: ${blockers.join(' ')}`
                : 'Blocked: insufficient current MLB position peer/team data for this selected team.'}
          </div>
        )}
      </div>
    </section>
  );
}

function FranchiseStadiumFoundationPanel({
  stadiums,
  selectedStadium,
  onSelectedStadiumChange,
  report,
  isLoading,
  error,
}: FranchiseStadiumFoundationPanelProps) {
  const [sprayRole, setSprayRole] = useState<FranchiseSprayChartRole | 'all'>('all');
  const [sprayPlayerId, setSprayPlayerId] = useState('all');
  const [sprayTeamId, setSprayTeamId] = useState('all');
  const [sprayStadiumId, setSprayStadiumId] = useState<'selected' | 'all' | string>('selected');
  const [sprayHandedness, setSprayHandedness] = useState<'all' | 'L' | 'R' | 'S'>('all');
  const [sprayOutcome, setSprayOutcome] = useState('all');
  const [sprayZoneId, setSprayZoneId] = useState('all');
  const [spraySortBy, setSpraySortBy] = useState<NonNullable<FranchiseSprayChartFilterSortOptions['sortBy']>>('timestamp');
  const [spraySortDirection, setSpraySortDirection] = useState<'asc' | 'desc'>('desc');
  const stadiumOptions = useMemo(() => {
    const reportNames = report?.stadiumIdentity.stadiums.map((stadium) => stadium.stadiumName) ?? [];
    return uniqueStrings([...stadiums, ...reportNames]).sort((left, right) => left.localeCompare(right));
  }, [report, stadiums]);
  const selected = useMemo(() => {
    if (!report) return null;
    return report.stadiumIdentity.stadiums.find((stadium) =>
      stadium.stadiumName === selectedStadium || stadium.stadiumId === selectedStadium,
    ) ?? report.stadiumIdentity.stadiums[0] ?? null;
  }, [report, selectedStadium]);
  const selectedRows = useMemo(() => {
    if (!report || !selected) return [];
    return filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      stadiumId: selected.stadiumId,
      sortBy: 'timestamp',
      sortDirection: 'desc',
    });
  }, [report, selected]);
  const effectiveSprayStadiumId = sprayStadiumId === 'all'
    ? undefined
    : sprayStadiumId === 'selected'
      ? selected?.stadiumId
      : sprayStadiumId;
  const stadiumFilteredRows = useMemo(() => {
    if (!report) return [];
    return filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      stadiumId: effectiveSprayStadiumId,
      sortBy: 'timestamp',
      sortDirection: 'desc',
    });
  }, [effectiveSprayStadiumId, report]);
  useEffect(() => {
    if (sprayPlayerId !== 'all' && !stadiumFilteredRows.some((row) => row.playerId === sprayPlayerId)) {
      setSprayPlayerId('all');
    }
    if (sprayTeamId !== 'all' && !stadiumFilteredRows.some((row) => row.teamId === sprayTeamId)) {
      setSprayTeamId('all');
    }
    if (sprayOutcome !== 'all' && !stadiumFilteredRows.some((row) => row.outcome === sprayOutcome)) {
      setSprayOutcome('all');
    }
    if (sprayZoneId !== 'all' && !stadiumFilteredRows.some((row) => row.zoneId === sprayZoneId)) {
      setSprayZoneId('all');
    }
  }, [sprayOutcome, sprayPlayerId, sprayTeamId, sprayZoneId, stadiumFilteredRows]);
  const selectedRowsByRole = (role: FranchiseSprayChartRole) =>
    selectedRows.filter((row) => row.role === role).length;
  const stadiumFilterOptions = useMemo(() => {
    const byId = new Map<string, string>();
    report?.sprayCharts.rows.forEach((row) => {
      byId.set(row.stadiumId, row.stadiumName || row.stadiumId);
    });
    return Array.from(byId.entries()).sort((left, right) => left[1].localeCompare(right[1]));
  }, [report]);
  const playerOptions = useMemo(() => {
    const byId = new Map<string, string>();
    stadiumFilteredRows.forEach((row) => {
      if (row.playerId) byId.set(row.playerId, row.playerName || row.playerId);
    });
    return Array.from(byId.entries()).sort((left, right) => left[1].localeCompare(right[1]));
  }, [stadiumFilteredRows]);
  const teamOptions = useMemo(() => uniqueStrings(stadiumFilteredRows.map((row) => row.teamId)).sort((left, right) => left.localeCompare(right)), [stadiumFilteredRows]);
  const outcomeOptions = useMemo(() => uniqueStrings(stadiumFilteredRows.map((row) => row.outcome)).sort((left, right) => left.localeCompare(right)), [stadiumFilteredRows]);
  const zoneOptions = useMemo(() => {
    const byId = new Map<string, string>();
    stadiumFilteredRows.forEach((row) => {
      if (row.zoneId) byId.set(row.zoneId, row.zoneName ?? row.zoneId);
    });
    return Array.from(byId.entries()).sort((left, right) => left[1].localeCompare(right[1]));
  }, [stadiumFilteredRows]);
  const filteredSprayRows = useMemo(() => {
    if (!report) return [];
    return filterAndSortFranchiseSprayChartRows(report.sprayCharts.rows, {
      stadiumId: effectiveSprayStadiumId,
      role: sprayRole,
      playerId: sprayPlayerId === 'all' ? undefined : sprayPlayerId,
      teamId: sprayTeamId === 'all' ? undefined : sprayTeamId,
      handedness: sprayHandedness === 'all' ? undefined : sprayHandedness,
      outcome: sprayOutcome === 'all' ? undefined : sprayOutcome,
      zoneId: sprayZoneId === 'all' ? undefined : sprayZoneId,
      sortBy: spraySortBy,
      sortDirection: spraySortDirection,
    });
  }, [
    effectiveSprayStadiumId,
    report,
    sprayHandedness,
    sprayOutcome,
    sprayPlayerId,
    sprayRole,
    spraySortBy,
    spraySortDirection,
    sprayTeamId,
    sprayZoneId,
  ]);
  const visibleSprayRows = filteredSprayRows.slice(0, 12);
  const hasScopedSprayRows = (report?.sprayCharts.rows.length ?? 0) > 0;
  const dimensions = selected?.dimensions ?? null;
  const seedFactors = selected?.seedParkFactors ?? null;
  const stadiumSourceLabel = selected
    ? 'Mode 2 copy'
    : 'No copied snapshot';
  const dimensionsSourceLabel = dimensions
    ? 'SMB4 dimensions matched'
    : 'Dimensions missing/untrusted';
  const seedSourceLabel = selected?.seedParkFactorsTrusted
    ? 'Seed factors trusted'
    : 'Seed factors missing/untrusted';

  return (
    <section
      role="region"
      aria-label="Franchise stadium foundation"
      className="border-[5px] border-[#4A6844] bg-[#6B9462] p-4"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-1 h-6 w-6 text-[#C4A853]" />
          <div>
            <div className="text-[14px] font-bold text-[#E8E8D8]">STADIUM FOUNDATION</div>
            <div className="mt-1 max-w-3xl text-[10px] leading-snug text-[#E8E8D8]/70">
              Read-only stadium identity, seed factors, and archive-backed spray evidence. Adaptive factors and records stay preview-only.
            </div>
          </div>
        </div>
        <FoundationStatusBadge status={report?.stadiumIdentity.status ?? 'blocked'} />
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
        <label className="block">
          <div className="mb-1 text-[10px] font-bold text-[#C4A853]">STADIUM</div>
          <select
            value={selected?.stadiumName ?? selectedStadium}
            onChange={(event) => onSelectedStadiumChange(event.target.value)}
            className="w-full border-2 border-[#4A6844] bg-[#3F563F] px-3 py-2 text-[11px] text-[#E8E8D8]"
            aria-label="Select stadium foundation report"
          >
            {stadiumOptions.length === 0 && <option value="">No stadiums loaded</option>}
            {stadiumOptions.map((stadium) => (
              <option key={stadium} value={stadium}>{stadium}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <FoundationStatusCard
            title="SOURCE OF TRUTH"
            status={selected ? 'trusted' : 'blocked'}
            body={selected
              ? 'Copied from Mode 1/League Builder. Custom dimensions are not editable in Mode 2.'
              : 'Missing copied stadium snapshot or archive stadium row.'}
          />
          <FoundationStatusCard
            title="SEED / STATIC FACTORS"
            status={selected?.seedParkFactorsTrusted ? 'trusted' : 'blocked'}
            body={selected?.seedParkFactorsTrusted
              ? 'Seed park factors are trusted as v1 stadium inputs.'
              : 'No seed/static park factors are available for this stadium yet.'}
          />
          <FoundationStatusCard
            title="ADAPTIVE FACTORS"
            status={selected?.adaptiveParkFactorPreview.status ?? 'not-applicable'}
            body={`${selected?.adaptiveParkFactorPreview.gamesIncluded ?? 0} scoped archive game(s). Preview-only; not persisted.`}
          />
          <FoundationStatusCard
            title="SPRAY EVIDENCE"
            status={report?.sprayCharts.status ?? 'blocked'}
            body={`${selectedRows.length} selected-stadium row(s): batting ${selectedRowsByRole('batting')}, pitching ${selectedRowsByRole('pitching')}, fielding ${selectedRowsByRole('fielding')}.`}
          />
          <FoundationStatusCard
            title="STADIUM RECORDS"
            status="preview-only"
            body="Storage boundary exists. Evidence-only records; no Team Hub edit/delete/generate controls."
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 border-2 border-[#4A6844] bg-[#3F563F] p-2 text-[9px] font-bold text-[#E8E8D8]/75">
        <span className="border border-[#E8E8D8]/20 bg-[#4A6844] px-2 py-0.5">{stadiumSourceLabel}</span>
        <span className={`border px-2 py-0.5 ${
          dimensions ? 'border-[#88DD44]/45 bg-[#274627] text-[#A8F08A]' : 'border-[#FFD27A]/45 bg-[#5A5130] text-[#FFEFB5]'
        }`}>{dimensionsSourceLabel}</span>
        <span className={`border px-2 py-0.5 ${
          selected?.seedParkFactorsTrusted ? 'border-[#88DD44]/45 bg-[#274627] text-[#A8F08A]' : 'border-[#FFD27A]/45 bg-[#5A5130] text-[#FFEFB5]'
        }`}>{seedSourceLabel}</span>
        <span className="border border-[#E8E8D8]/20 bg-[#4A6844] px-2 py-0.5">Custom dimensions blocked</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[12px] font-bold text-[#C4A853]">SPRAY CHART</div>
              <div className="mt-1 text-[9px] leading-snug text-[#E8E8D8]/60">
                Graphic plot from scoped completed-game spray evidence. Heat map remains deferred.
              </div>
            </div>
            <div className="text-[9px] font-bold text-[#E8E8D8]/60">
              {filteredSprayRows.length} POINT(S) · READ ONLY
            </div>
          </div>
          <FranchiseSprayChartGraphic
            rows={filteredSprayRows}
            dimensionsAvailable={Boolean(dimensions)}
            stadiumName={selected?.stadiumName ?? selectedStadium}
          />
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
          <div className="mb-2 text-[10px] font-bold text-[#C4A853]">EVIDENCE FILTERS</div>
          {hasScopedSprayRows ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div
                  className="border border-[#E8E8D8]/20 bg-[#3F563F] p-2 text-[9px] leading-snug text-[#E8E8D8]/65"
                  data-testid="spray-scope-filter-summary"
                >
                  <div className="font-bold text-[#C4A853]">Scope</div>
                  <div>Franchise {report?.scope.franchiseId}</div>
                  <div>Season {report?.scope.seasonId}</div>
                  <div>Stats {report?.scope.statsScopeId}</div>
                </div>
                <SprayFilterSelect
                  label="Stadium"
                  value={sprayStadiumId}
                  onChange={setSprayStadiumId}
                  options={[
                    ['selected', `Selected stadium (${selected?.stadiumName ?? (selectedStadium || 'none')})`],
                    ['all', 'All scoped stadiums'],
                    ...stadiumFilterOptions.map(([stadiumId, stadiumName]) => [stadiumId, `${stadiumName} (${stadiumId})`] as [string, string]),
                  ]}
                />
                <SprayFilterSelect
                  label="Role"
                  value={sprayRole}
                  onChange={(value) => setSprayRole(value as FranchiseSprayChartRole | 'all')}
                  options={[
                    ['all', 'All roles'],
                    ['batting', 'Batting'],
                    ['pitching', 'Pitching'],
                    ['fielding', 'Fielding'],
                  ]}
                />
                <SprayFilterSelect
                  label="Player"
                  value={sprayPlayerId}
                  onChange={setSprayPlayerId}
                  options={[
                    ['all', 'All players'],
                    ...playerOptions.map(([playerId, playerName]) => [playerId, `${playerName} (${playerId})`] as [string, string]),
                  ]}
                />
                <SprayFilterSelect
                  label="Team"
                  value={sprayTeamId}
                  onChange={setSprayTeamId}
                  options={[
                    ['all', 'All teams'],
                    ...teamOptions.map((teamId) => [teamId, teamId] as [string, string]),
                  ]}
                />
                <SprayFilterSelect
                  label="Hand"
                  value={sprayHandedness}
                  onChange={(value) => setSprayHandedness(value as 'all' | 'L' | 'R' | 'S')}
                  options={[
                    ['all', 'All hands'],
                    ['L', 'L'],
                    ['R', 'R'],
                    ['S', 'S'],
                  ]}
                />
                <SprayFilterSelect
                  label="Outcome"
                  value={sprayOutcome}
                  onChange={setSprayOutcome}
                  options={[
                    ['all', 'All outcomes'],
                    ...outcomeOptions.map((outcome) => [outcome, outcome] as [string, string]),
                  ]}
                />
                <SprayFilterSelect
                  label="Zone"
                  value={sprayZoneId}
                  onChange={setSprayZoneId}
                  options={[
                    ['all', 'All zones'],
                    ...zoneOptions.map(([zoneId, zoneName]) => [zoneId, `${zoneName} (${zoneId})`] as [string, string]),
                  ]}
                />
                <SprayFilterSelect
                  label="Sort"
                  value={spraySortBy}
                  onChange={(value) => setSpraySortBy(value as NonNullable<FranchiseSprayChartFilterSortOptions['sortBy']>)}
                  options={[
                    ['timestamp', 'Time'],
                    ['frequency', 'Frequency'],
                    ['player', 'Player'],
                    ['team', 'Team'],
                    ['stadium', 'Stadium'],
                    ['outcome', 'Outcome'],
                    ['zone', 'Zone'],
                  ]}
                />
                <SprayFilterSelect
                  label="Order"
                  value={spraySortDirection}
                  onChange={(value) => setSpraySortDirection(value as 'asc' | 'desc')}
                  options={[
                    ['desc', 'Newest / Z-A'],
                    ['asc', 'Oldest / A-Z'],
                  ]}
                />
              </div>
          ) : (
            <div className="text-[10px] leading-snug text-[#E8E8D8]/65">
              No scoped spray event detail yet. Completed-game archive rows can still prove stadium identity/sample.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,0.65fr)_minmax(0,1fr)]">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
          <div className="mb-2 text-[10px] font-bold text-[#C4A853]">STADIUM STATS / ADVANCED METRICS</div>
          {selected ? (
            <div className="space-y-2 text-[10px] leading-snug text-[#E8E8D8]/75">
              <div className="text-[12px] font-bold text-[#E8E8D8]">{selected.stadiumName}</div>
              {dimensions ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="border border-[#E8E8D8]/20 p-2">LF {dimensions.lf}</div>
                  <div className="border border-[#E8E8D8]/20 p-2">CF {dimensions.cf}</div>
                  <div className="border border-[#E8E8D8]/20 p-2">RF {dimensions.rf}</div>
                </div>
              ) : (
                <div>Dimensions unavailable for this stadium identity. Chart uses a safe default field layout.</div>
              )}
              <div>
                Archive rows: {selected.archiveGameRows}. Spray rows: {selected.sprayEventRows}.
              </div>
              {seedFactors ? (
                <div>
                  Runs {seedFactors.runs.toFixed(2)} / HR {seedFactors.homeRuns.toFixed(2)} / Overall {seedFactors.overall.toFixed(2)} / Confidence {seedFactors.confidence}
                </div>
              ) : (
                <div>Seed park factor row unavailable.</div>
              )}
              <div className="text-[#E8E8D8]/55">
                Adaptive factors are preview-only. Park-adjusted WAR/value consumers remain blocked.
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#E8E8D8]/65">
              {isLoading ? 'Loading stadium foundation data.' : 'No stadium foundation rows are available.'}
            </div>
          )}
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
          <div className="mb-2 text-[10px] font-bold text-[#C4A853]">STADIUM RECORDS</div>
          <div className="space-y-2 text-[10px] leading-snug text-[#E8E8D8]/70">
            <div>Evidence-only record storage boundary exists.</div>
            <div>No Team Hub record edit, delete, generate, adaptive-factor, or park-adjusted WAR controls are active.</div>
            <div className="border border-[#E8E8D8]/20 bg-[#3F563F] p-2 text-[#E8E8D8]/60">
              Records can summarize archive-backed team/game/spray evidence later; this panel does not write records.
            </div>
          </div>
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-bold text-[#C4A853]">SPRAY EVIDENCE DETAILS</div>
            <div className="text-[9px] font-bold text-[#E8E8D8]/60">
              {filteredSprayRows.length} ROW(S) · READ ONLY
            </div>
          </div>
          <div className="mb-2 text-[9px] leading-snug text-[#E8E8D8]/55">
            Compact audit list for the plotted evidence above.
          </div>

          {hasScopedSprayRows ? (
            <>
              {visibleSprayRows.length > 0 ? (
                <div className="space-y-2">
                  {visibleSprayRows.map((row) => (
                    <article key={`${row.role}:${row.eventId}:${row.playerId}`} className="border border-[#E8E8D8]/20 p-2 text-[10px] leading-snug text-[#E8E8D8]/75">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#E8E8D8]">{row.playerName}</span>
                        <span className="text-[#C4A853]">{row.role.toUpperCase()}</span>
                      </div>
                      <div>
                        {row.outcome} · {row.zoneName ?? 'Unknown zone'} · {row.direction} / {row.depth}
                        {row.handedness ? ` · Hand ${row.handedness}` : ''}
                      </div>
                      <div>
                        Team {row.teamId} · Stadium {row.stadiumName} ({row.stadiumId})
                      </div>
                      <div className="text-[#E8E8D8]/50">
                        Source game {row.gameId} · Evidence {row.eventId} · Source {row.source}
                      </div>
                    </article>
                  ))}
                  {filteredSprayRows.length > visibleSprayRows.length && (
                    <div className="border border-[#E8E8D8]/15 p-2 text-[10px] text-[#E8E8D8]/60">
                      Showing first {visibleSprayRows.length} filtered row(s). Narrow the filters to inspect the remaining evidence.
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-[#E8E8D8]/15 p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
                  No spray rows match the current read-only filters.
                </div>
              )}
            </>
          ) : (
            <div className="text-[10px] leading-snug text-[#E8E8D8]/65">
              No scoped spray event detail yet. Completed-game archive rows can still prove stadium identity/sample.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 border-2 border-[#4A6844] bg-[#3F563F] p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
        This panel writes no stadium records, adaptive factors, random events, morale changes, designations, salary changes, relationship changes, stories, offseason state, or player-profile automation.
      </div>
    </section>
  );
}

function SprayFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[9px] font-bold text-[#C4A853]">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[#E8E8D8]/20 bg-[#3F563F] px-2 py-1.5 text-[10px] text-[#E8E8D8]"
        aria-label={`Spray ${label.toLowerCase()} filter`}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function roleLabel(role: FranchiseSprayChartRole): string {
  if (role === 'batting') return 'BAT';
  if (role === 'pitching') return 'PIT';
  return 'FLD';
}

function roleColor(role: FranchiseSprayChartRole): string {
  if (role === 'batting') return '#F2CC8F';
  if (role === 'pitching') return '#81B29A';
  return '#A9BCD0';
}

function outcomeStroke(outcome: string): string {
  const normalized = outcome.toUpperCase();
  if (normalized === 'HR') return '#FF6B6B';
  if (normalized === '2B' || normalized === '3B') return '#FFD166';
  if (normalized.includes('E')) return '#B388FF';
  if (normalized.includes('O') || normalized.includes('DP') || normalized.includes('FC')) return '#D8DEE9';
  return '#FFFFFF';
}

function pointOffset(index: number): { x: number; y: number } {
  const offsets = [
    { x: 0, y: 0 },
    { x: 2.4, y: -1.8 },
    { x: -2.4, y: 1.8 },
    { x: 2.4, y: 1.8 },
    { x: -2.4, y: -1.8 },
  ];
  return offsets[index % offsets.length];
}

function fallbackPointForSprayRow(row: FranchiseSprayChartRow): { x: number; y: number } {
  const depthY: Record<string, number> = {
    infield: 62,
    shallow: 42,
    medium: 24,
    deep: 11,
    foul_shallow: 70,
    foul_medium: 38,
    foul_deep: 16,
    foul_catcher: 92,
    unknown: 44,
  };
  const directionX: Record<string, number> = {
    pull: row.handedness === 'L' ? 76 : 24,
    pull_center: row.handedness === 'L' ? 62 : 38,
    center: 50,
    oppo_center: row.handedness === 'L' ? 38 : 62,
    oppo: row.handedness === 'L' ? 24 : 76,
    foul_left: 8,
    foul_right: 92,
    foul_back: 50,
    unknown: 50,
  };
  return {
    x: directionX[row.direction] ?? 50,
    y: depthY[row.depth] ?? 44,
  };
}

function pointForSprayRow(row: FranchiseSprayChartRow, index: number): { x: number; y: number } {
  const center = row.zoneId ? ZONE_CENTERS[row.zoneId] : null;
  const base = center ?? fallbackPointForSprayRow(row);
  const offset = pointOffset(index);
  return {
    x: Math.max(2, Math.min(98, base.x + offset.x)),
    y: Math.max(3, Math.min(97, base.y + offset.y)),
  };
}

function FranchiseSprayChartGraphic({
  rows,
  stadiumName,
  dimensionsAvailable,
}: {
  rows: FranchiseSprayChartRow[];
  stadiumName: string;
  dimensionsAvailable: boolean;
}) {
  const plottedRows = rows.slice(0, 80);
  const groupedByRole = plottedRows.reduce<Record<FranchiseSprayChartRole, number>>((counts, row) => {
    counts[row.role] += 1;
    return counts;
  }, { batting: 0, pitching: 0, fielding: 0 });

  return (
    <div>
      <svg
        role="img"
        aria-label={`Spray chart graphic for ${stadiumName || 'selected stadium'}`}
        data-testid="team-hub-stadium-spray-chart"
        viewBox="0 0 100 100"
        className="h-[360px] w-full border-2 border-[#2F4C36] bg-[#20382A]"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{`Spray chart for ${stadiumName || 'selected stadium'}`}</title>
        <rect x="0" y="0" width="100" height="100" fill="#20382A" />
        <path d="M 50 96 L 2 18 Q 50 -8 98 18 Z" fill="#274A34" stroke="#8EA87E" strokeWidth="0.7" />
        <path d="M 50 96 L 10 24 Q 50 3 90 24 Z" fill="none" stroke="#D0B56D" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.75" />
        <path d="M 50 96 L 22 48 Q 50 20 78 48 Z" fill="none" stroke="#7FA372" strokeWidth="0.45" opacity="0.85" />
        <polygon points="50,92 36,76 50,61 64,76" fill="#8C6A3D" opacity="0.38" stroke="#F4F1DE" strokeWidth="0.45" />
        <line x1="50" y1="96" x2="0" y2="8" stroke="#F4F1DE" strokeWidth="0.35" opacity="0.7" />
        <line x1="50" y1="96" x2="100" y2="8" stroke="#F4F1DE" strokeWidth="0.35" opacity="0.7" />
        {Object.entries(ZONE_POLYGONS).map(([zoneId, points]) => (
          <path
            key={zoneId}
            d={points}
            data-testid={`team-hub-spray-zone-${zoneId}`}
            fill={zoneId.startsWith('F') ? '#5A4A37' : '#365A3D'}
            opacity={zoneId.startsWith('F') ? 0.12 : 0.16}
            stroke="#D8E8D0"
            strokeWidth="0.12"
          />
        ))}
        <rect x="48.7" y="93.2" width="2.6" height="2.6" fill="#F4F1DE" />
        <rect x="34.5" y="74.3" width="2" height="2" fill="#F4F1DE" />
        <rect x="49" y="59.8" width="2" height="2" fill="#F4F1DE" />
        <rect x="62.5" y="74.3" width="2" height="2" fill="#F4F1DE" />
        {plottedRows.map((row, index) => {
          const point = pointForSprayRow(row, index);
          const fill = roleColor(row.role);
          const stroke = outcomeStroke(row.outcome);
          const key = `${row.role}:${row.eventId}:${row.playerId}:${index}`;
          const label = `${roleLabel(row.role)} ${row.playerName}: ${row.outcome}, ${row.zoneName ?? row.zoneId ?? 'unknown zone'}, ${row.source}`;
          return (
            <g key={key} data-testid={`spray-point-${row.role}`} aria-label={label}>
              <title>{label}</title>
              {row.role === 'fielding' ? (
                <rect
                  x={point.x - 1.7}
                  y={point.y - 1.7}
                  width="3.4"
                  height="3.4"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="0.65"
                />
              ) : row.role === 'pitching' ? (
                <polygon
                  points={`${point.x},${point.y - 2.2} ${point.x + 2.1},${point.y + 1.7} ${point.x - 2.1},${point.y + 1.7}`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="0.65"
                />
              ) : (
                <circle cx={point.x} cy={point.y} r="2.1" fill={fill} stroke={stroke} strokeWidth="0.65" />
              )}
            </g>
          );
        })}
        {plottedRows.length === 0 ? (
          <text x="50" y="48" textAnchor="middle" fill="#F4F1DE" fontSize="3.2" fontFamily="monospace">
            NO SCOPED SPRAY POINTS
          </text>
        ) : null}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold text-[#E8E8D8]/70">
        <span className="border border-[#F2CC8F]/50 px-2 py-1 text-[#F2CC8F]">● Batting {groupedByRole.batting}</span>
        <span className="border border-[#81B29A]/50 px-2 py-1 text-[#A7F3C1]">▲ Pitching {groupedByRole.pitching}</span>
        <span className="border border-[#A9BCD0]/50 px-2 py-1 text-[#D8E7FF]">■ Fielding {groupedByRole.fielding}</span>
        <span className="border border-[#E8E8D8]/20 px-2 py-1">
          {dimensionsAvailable ? 'Trusted dimensions' : 'Default field layout'}
        </span>
        {rows.length > plottedRows.length ? (
          <span className="border border-[#E8E8D8]/20 px-2 py-1">Showing first {plottedRows.length} points</span>
        ) : null}
      </div>
    </div>
  );
}

function FranchiseMode2FoundationStatusPanel({
  selectedTeamId,
  selectedTeamName,
  valueInputReport,
  trueValuePreviewReport,
  expectedWinsPreviewReport,
  analyticsTrustReport,
  salaryLifecycleReport,
  designationEligibilityReport,
  projectedDesignationRows,
  moraleRelationshipTrustReport,
  narrativeEventEligibilityReport,
  isLoading,
  error,
}: FranchiseMode2FoundationStatusPanelProps) {
  const valueRows = valueInputReport?.rows.length ?? 0;
  const stableSalaryRows = salaryLifecycleReport?.playerRecords.filter((record) =>
    record.currentSalaryCalculation?.status === 'active' || record.initialSalaryBaseline.status === 'stable-baseline',
  ).length ?? 0;
  const salaryRows = salaryLifecycleReport?.playerRecords.length ?? 0;
  const blockedSalaryRows = salaryLifecycleReport?.playerRecords.filter((record) =>
    record.initialSalaryBaseline.status !== 'stable-baseline',
  ).length ?? 0;
  const activeDesignationCount = projectedDesignationRows.filter((record) =>
    record.status === 'active' && (!selectedTeamId || record.teamId === selectedTeamId),
  ).length;
  const projectedDesignationCount = projectedDesignationRows.filter((record) =>
    record.status === 'projected' && (!selectedTeamId || record.teamId === selectedTeamId),
  ).length;
  const blockedDesignationCount = designationEligibilityReport?.records.filter((record) =>
    record.status === 'blocked',
  ).length ?? 0;
  const hiddenFarmRows = narrativeEventEligibilityReport?.hiddenFarmProspectData.hiddenSafeRows ?? 0;

  const statsStatus = analyticsTrustReport?.coreStats.status ?? 'blocked';
  const valueStatus = valueInputReport?.trueValuePolicy.finalTrueValueCalculated
    ? 'trusted'
    : (valueRows > 0 ? 'preview-only' : 'blocked');
  const salaryStatus = stableSalaryRows > 0 && blockedSalaryRows === 0
    ? 'trusted'
    : (stableSalaryRows > 0 ? 'partial' : 'blocked');
  const designationStatus = activeDesignationCount > 0
    ? 'active'
    : projectedDesignationCount > 0
    ? 'preview-only'
    : (blockedDesignationCount > 0 ? 'blocked' : 'preview-only');
  const designationBody = activeDesignationCount > 0
    ? `${activeDesignationCount} live canonical row(s), ${projectedDesignationCount} projected canonical row(s), ${blockedDesignationCount} blocked eligibility row(s). Season-end locking, awards, morale, salary, and Mode 3 effects stay blocked.`
    : `${projectedDesignationCount} projected canonical row(s), ${blockedDesignationCount} blocked eligibility row(s). Season-end locking, awards, morale, salary, and Mode 3 effects stay blocked.`;
  const moraleStatus = moraleRelationshipTrustReport?.scope.status ?? 'blocked';
  const narrativeStatus = narrativeEventEligibilityReport?.downstreamConsumers.readOnlySummaries.status ?? 'blocked';

  return (
    <section
      role="region"
      aria-label="Mode 2 Foundation Status"
      className="mb-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">MODE 2 FOUNDATION STATUS</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/60">
            Read-only gate summary. These labels explain what can be reported as context and what remains blocked or deferred.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[10px] text-[#E8E8D8]">
          {isLoading ? 'LOADING' : 'READ ONLY'}
        </div>
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <FoundationStatusCard
          title="STATS / ARCHIVE / SCOPE"
          status={statsStatus}
          body={`${analyticsTrustReport?.coreStats.scopedArchiveRows ?? 0} scoped archive-backed game(s), ${analyticsTrustReport?.coreStats.seasonStatsRows ?? 0} stat row(s). Scope identity stays required.`}
        />
        <FoundationStatusCard
          title="VALUE INPUTS"
          status={valueStatus}
          body={`${valueRows} canonical player row(s). Final True Value and value delta remain deferred.`}
        />
        <FoundationStatusCard
          title="SALARY LIFECYCLE"
          status={salaryStatus}
          body={`${stableSalaryRows}/${salaryRows} current salary row(s). Team payroll proof is real; luxury tax, salary matching, and offseason automation stay blocked.`}
        />
        <FoundationStatusCard
          title="DESIGNATION ELIGIBILITY"
          status={designationStatus}
          body={designationBody}
        />
        <FoundationStatusCard
          title="MORALE / RELATIONSHIPS"
          status={moraleStatus}
          body="Visible personality and chemistry may be read-only context. Morale and relationship state changes stay blocked."
        />
        <FoundationStatusCard
          title="NARRATIVE / RANDOM EVENTS"
          status={narrativeStatus}
          body="Stable facts may be read-only summary context. Narrative generation, random events, and story persistence stay blocked."
        />
      </div>

      <FranchiseValueExpectedWinsPreviewPanel
        selectedTeamId={selectedTeamId}
        selectedTeamName={selectedTeamName}
        trueValuePreviewReport={trueValuePreviewReport}
        expectedWinsPreviewReport={expectedWinsPreviewReport}
        salaryLifecycleReport={salaryLifecycleReport}
        isLoading={isLoading}
      />

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="border-2 border-[#4A6844] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          <div className="mb-1 font-bold text-[#FFEFB5]">Blocked / inactive systems</div>
          <div>True Value finalization: BLOCKED / DEFERRED.</div>
          <div>Salary movement: {formatTruthStatus(narrativeEventEligibilityReport?.salaryMovement.status ?? 'blocked')}.</div>
          <div>Morale state changes: {formatTruthStatus(narrativeEventEligibilityReport?.downstreamConsumers.moraleMutation.status ?? 'blocked')}.</div>
          <div>Relationship state changes: {formatTruthStatus(narrativeEventEligibilityReport?.downstreamConsumers.relationshipMutation.status ?? 'blocked')}.</div>
          <div>Narrative/random event generation: {formatTruthStatus(narrativeEventEligibilityReport?.downstreamConsumers.randomEventGeneration.status ?? 'blocked')}.</div>
          <div>Story persistence: {formatTruthStatus(narrativeEventEligibilityReport?.downstreamConsumers.storyPersistence.status ?? 'blocked')}.</div>
          <div>Awards persistence: BLOCKED.</div>
          <div>Mode 3/offseason execution: {formatTruthStatus(narrativeEventEligibilityReport?.downstreamConsumers.mode3OffseasonExecution.status ?? 'deferred')}.</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/70">
          <div className="mb-1 font-bold text-[#C4A853]">Hidden-safe boundary</div>
          <div>Unrevealed FARM/prospect hidden inputs: {hiddenFarmRows > 0 ? 'BLOCKED' : 'NOT APPLICABLE'}.</div>
          <div>True ratings, true grade, hidden scout truth, and hidden personality modifiers are not surfaced as event inputs.</div>
          <div className="mt-2 text-[#E8E8D8]/55">
            This panel creates no records and enables no mutation actions.
          </div>
        </div>
      </div>
    </section>
  );
}

function FranchiseFanMoralePanel({
  snapshots,
  selectedTeamId,
  selectedTeamName,
  isLoading,
  error,
  actionId,
  message,
  manualError,
  onApplyManualMorale,
}: FranchiseFanMoralePanelProps) {
  const teamFanSnapshot = snapshots.find((snapshot) =>
    snapshot.targetType === 'team-fan' && snapshot.teamId === selectedTeamId,
  );
  const playerSnapshots = snapshots.filter((snapshot) => snapshot.targetType === 'player');
  const specView = buildFranchiseFanMoraleSpecViewModel({
    snapshot: teamFanSnapshot ?? null,
    fallbackTeamId: selectedTeamId,
    fallbackTeamName: selectedTeamName,
  });

  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b-2 border-[#4A6844] pb-2">
        <div>
          <div className="text-[12px] font-bold text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            FAN MORALE
          </div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Canonical Franchise v1 morale comes from confirmed random-event or manual override evidence only.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[10px] text-[#E8E8D8]">
          {isLoading ? 'LOADING' : `${snapshots.length} SNAPSHOT(S)`}
        </div>
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <section className="border-[4px] border-[#4A6844] bg-[#5A8352] p-3" aria-label="Selected team fan morale">
          <div className="text-[10px] font-bold text-[#C4A853]">SELECTED TEAM</div>
          <div className="mt-1 text-[12px] font-bold text-[#E8E8D8]">{selectedTeamName || 'No team selected'}</div>
          <div className="mt-3 text-[36px] font-black leading-none text-[#E8E8D8]">
            {specView.currentValue}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#C4A853]">
            {specView.state} · {specView.trend} · {specView.riskLevel}
          </div>
          <div className="mt-1 text-[10px] text-[#E8E8D8]/65">
            {teamFanSnapshot && specView.lastEvent
              ? `Last event: ${specView.lastEvent.reason}`
              : teamFanSnapshot
                ? `Last updated ${new Date(teamFanSnapshot.lastModified).toLocaleString()}`
              : 'Neutral baseline. No confirmed event-backed fan morale changes yet.'}
          </div>
        </section>

        <section className="border-[4px] border-[#4A6844] bg-[#5A8352] p-3" aria-label="Fan morale history">
          <div className="mb-2 text-[10px] font-bold text-[#C4A853]">EVENT-BACKED HISTORY</div>
          {teamFanSnapshot?.history.length ? (
            <div className="space-y-2">
              {teamFanSnapshot.history.slice().reverse().slice(0, 6).map((entry) => (
                <div key={entry.id} className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/75">
                  <div className="font-bold text-[#E8E8D8]">
                    {entry.previousValue} → {entry.currentValue} ({entry.delta > 0 ? '+' : ''}{entry.delta})
                  </div>
                  <div className="mt-1">{entry.reason}</div>
                  <div className="mt-1 text-[#E8E8D8]/55">
                    Source: {entry.sourceKind} · {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3 text-[10px] leading-snug text-[#E8E8D8]/65">
              No durable fan morale history yet. Confirm an eligible random-event prompt to create the first event-backed change.
            </div>
          )}
        </section>
      </div>

      <FranchiseManualMoraleAdjustmentPanel
        title="MANUAL FAN MORALE ADJUSTMENT"
        targetType="team-fan"
        targetId={selectedTeamId}
        targetLabel={`${selectedTeamName || 'Selected team'} (${selectedTeamId || 'missing-team'})`}
        deltaLabel="Fan morale delta"
        reasonLabel="Fan morale reason"
        actionId={actionId}
        message={message}
        error={manualError}
        disabled={!selectedTeamId}
        onApply={onApplyManualMorale}
      />

      <FranchiseFanMoraleSpecAlignmentPanel view={specView} />

      <div className="mt-3 border-2 border-[#4A6844] bg-[#3F563F] p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
        Player morale snapshots stored this season: {playerSnapshots.length}. Relationship mutation, salary movement, profile automation, awards/designations, and Mode 3/offseason effects remain blocked.
      </div>
    </div>
  );
}

function FranchiseFanMoraleSpecAlignmentPanel({ view }: { view: FranchiseFanMoraleSpecViewModel }) {
  const implementedAreas = [
    view.implementationStatus.canonicalStorage,
    view.implementationStatus.confirmedEventEffects,
    view.implementationStatus.teamHubDisplay,
    view.implementationStatus.eventBackedHistory,
  ];
  const pendingAreas = [
    view.implementationStatus.randomEventConfirmation,
    view.implementationStatus.scoreOnlyFanMorale,
    view.implementationStatus.expectedWinsBaseline,
    view.implementationStatus.performanceGapFormula,
    view.implementationStatus.rosterCompositionFormula,
    view.implementationStatus.randomEventWeighting,
    view.implementationStatus.trueValueInputs,
    view.implementationStatus.designations,
    view.implementationStatus.beatReporterSentiment,
    view.implementationStatus.freeAgencyConsequences,
    view.implementationStatus.franchiseHealthConsequences,
    view.implementationStatus.dailySnapshots,
    view.implementationStatus.automaticGameTrackerMutation,
    view.implementationStatus.playerMoraleCoupling,
  ];

  return (
    <section
      className="mt-3 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
      aria-label="Fan morale spec alignment status"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold text-[#C4A853]">FAN MORALE SPEC ALIGNMENT</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Read-only alignment with the fan morale spec. Current storage/display support is not the full formula engine.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[10px] text-[#E8E8D8]">
          READ ONLY
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]">
          <div className="font-bold text-[#C4A853]">Current</div>
          <div className="mt-1">Value: {view.currentValue}</div>
          <div>Previous: {view.previousValue ?? '—'}</div>
          <div>State: {view.state}</div>
          <div>Trend: {view.trend}</div>
          <div>Risk: {view.riskLevel}</div>
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/75">
          <div className="font-bold text-[#C4A853]">Implemented</div>
          <div className="mt-1 space-y-1">
            {implementedAreas.map((area) => (
              <div key={area.label}>{area.label}: {formatTruthStatus(area.status)}</div>
            ))}
          </div>
        </div>

        <div className="border-2 border-[#4A6844] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          <div className="font-bold text-[#FFEFB5]">Deferred / Blocked</div>
          <div className="mt-1 space-y-1">
            {pendingAreas.map((area) => (
              <div key={area.label}>{area.label}: {formatTruthStatus(area.status)}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
        {view.lastEvent
          ? `Last event/reason: ${view.lastEvent.reason}`
          : 'Last event/reason: no confirmed event-backed fan morale change yet.'}
        <div className="mt-1">
          Expected wins, performance gap, roster composition formula, random-event weighting, daily snapshots, designations, beat reporter sentiment, salary/True Value inputs, free-agency consequences, franchise health consequences, relationships, narrative/random events, and Mode 3/offseason effects remain partial, blocked, or deferred.
        </div>
      </div>
    </section>
  );
}

function FranchiseRandomEventLogPanel({
  report,
  records,
  selectedTeamId,
  selectedTeamName,
  isLoading,
  error,
  actionId,
  onConfirm,
  onDismiss,
}: FranchiseRandomEventLogPanelProps) {
  const visibleRecords = records.slice(0, 16);
  const readyCount = records.filter((record) => record.confirmation.state === 'unconfirmed').length;
  const confirmedCount = records.filter((record) => record.confirmation.state === 'confirmed').length;
  const dismissedCount = records.filter((record) => record.confirmation.state === 'dismissed').length;

  return (
    <section
      role="region"
      aria-label="Franchise random event log preview"
      className="mb-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-[#C4A853]">RANDOM EVENT LOG</div>
          <div className="mt-1 text-[10px] leading-snug text-[#E8E8D8]/65">
            Durable Franchise v1 prompt records. Confirming can apply only safe fan/player morale effects through scoped morale storage.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[10px] text-[#E8E8D8]">
          {isLoading ? 'LOADING' : `${records.length} RECORD(S)`}
        </div>
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <FoundationStatusCard
          title="READY"
          status={readyCount > 0 ? 'ready-for-review' : 'not-applicable'}
          body={`${readyCount} durable prompt(s) ready for manual review.`}
        />
        <FoundationStatusCard
          title="CONFIRMED"
          status={confirmedCount > 0 ? 'confirmed-manual-change' : 'not-applicable'}
          body={`${confirmedCount} confirmed prompt(s) with applied/skipped effect state.`}
        />
        <FoundationStatusCard
          title="DISMISSED"
          status={dismissedCount > 0 ? 'dismissed' : 'not-applicable'}
          body={`${dismissedCount} dismissed prompt(s).`}
        />
        <FoundationStatusCard
          title="AUTOMATION"
          status="blocked"
          body="Profile, relationship, salary, story, park-factor, designation, and Mode 3 mutations remain blocked."
        />
      </div>

      <div
        className="mb-3 grid gap-2 text-[10px] leading-snug text-[#E8E8D8]/75 md:grid-cols-4"
        aria-label="Random event manual review workflow"
      >
        <div className="border-2 border-[#4A6844] bg-[#5A8352] p-2">
          <div className="font-bold text-[#C4A853]">1. EVIDENCE</div>
          <div>Generated from scoped archive, schedule, roster, profile, or stadium facts.</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] p-2">
          <div className="font-bold text-[#C4A853]">2. SAFE EFFECT</div>
          <div>Review the exact team fan or revealed player morale target before acting.</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] p-2">
          <div className="font-bold text-[#C4A853]">3. DECISION</div>
          <div>Confirm to persist the decision and apply allowed morale; dismiss to skip it.</div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] p-2">
          <div className="font-bold text-[#C4A853]">4. VERIFY</div>
          <div>Check Fan Morale or Player Profile history after confirmation.</div>
        </div>
      </div>

      {report?.blockers.length ? (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
          {report.blockers.join(' ')}
        </div>
      ) : null}

      {visibleRecords.length > 0 ? (
        <div className="space-y-2">
          {visibleRecords.map((record) => {
            const entry = record.entry;
            const effectPreview = classifyFranchiseRandomEventSafeEffect(
              record,
              randomEventSafeEffectTarget(record, selectedTeamId || undefined),
            );
            const sourceLabel = randomEventSourceLabel(record);
            const effectTeamLabel = effectPreview.teamId
              ? effectPreview.teamId === selectedTeamId
                ? selectedTeamName || effectPreview.teamId
                : effectPreview.teamId
              : 'selected team';
            const targetLabel = effectPreview.allowed
              ? effectPreview.targetType === 'player'
                ? `Player morale target: ${effectPreview.playerId}`
                : `Team fan morale target: ${effectTeamLabel}`
              : 'No safe morale target';
            const followUpLabel = randomEventFollowUpLabel(effectPreview);
            return (
            <article key={record.id} className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] font-bold text-[#E8E8D8]">{entry.title}</div>
                <FoundationStatusBadge
                  status={
                    record.confirmation.state === 'confirmed'
                      ? 'confirmed-manual-change'
                      : record.confirmation.state === 'dismissed'
                        ? 'dismissed'
                        : entry.status
                  }
                />
              </div>
              <div className="mb-2 grid gap-2 text-[10px] leading-snug text-[#E8E8D8]/70 md:grid-cols-3">
                <div className="border border-[#E8E8D8]/20 p-2">
                  <span className="font-bold text-[#C4A853]">Source:</span> {sourceLabel}
                </div>
                <div className="border border-[#E8E8D8]/20 p-2">
                  <span className="font-bold text-[#C4A853]">Safe target:</span> {targetLabel}
                </div>
                <div className="border border-[#E8E8D8]/20 p-2">
                  <span className="font-bold text-[#C4A853]">Follow-up:</span> {followUpLabel}
                </div>
              </div>
              <div className="grid gap-2 text-[10px] leading-snug text-[#E8E8D8]/75 lg:grid-cols-2">
                <div>
                  <div className="mb-1 font-bold text-[#C4A853]">Evidence / reason</div>
                  <div>{entry.reason}</div>
                  <div className="mt-1 text-[#E8E8D8]/55">
                    Evidence: {entry.evidenceReferences.map((reference) => `${reference.type} (${reference.count})`).join(', ')}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-bold text-[#C4A853]">Suggested manual change</div>
                  <div>{entry.suggestedManualChange.summary}</div>
                  <div className="mt-1 text-[#E8E8D8]/55">
                    Checkbox state: Manual change completed {record.confirmation.checked ? 'checked' : 'unchecked'}.
                  </div>
                </div>
              </div>
              <div className="mt-2 grid gap-2 text-[10px] leading-snug lg:grid-cols-2">
                <div className="border border-[#E8E8D8]/20 p-2 text-[#E8E8D8]/70">
                  <div className="mb-1 font-bold text-[#C4A853]">Safe-effect preview</div>
                  <div>
                    {effectPreview.allowed
                      ? `On confirm: ${effectPreview.targetType === 'team-fan' ? 'Team fan morale' : 'Player morale'} ${effectPreview.delta > 0 ? '+' : ''}${effectPreview.delta}${effectPreview.teamId ? ` for ${effectTeamLabel}` : ''}.`
                      : 'No safe morale effect target is available yet.'}
                  </div>
                  {effectPreview.blockers.length > 0 && (
                    <div className="mt-1 text-[#FFD6D6]">{effectPreview.blockers.join(' ')}</div>
                  )}
                  {effectPreview.warnings.length > 0 && (
                    <div className="mt-1 text-[#FFD27A]">{effectPreview.warnings.join(' ')}</div>
                  )}
                </div>
                <div className="border border-[#E8E8D8]/20 p-2 text-[#E8E8D8]/70">
                  <div className="mb-1 font-bold text-[#C4A853]">Applied state</div>
                  <div>{record.appliedEffect.state.toUpperCase()}: {record.appliedEffect.reason}</div>
                  {record.appliedEffect.currentValue != null && (
                    <div className="mt-1 text-[#E8E8D8]/55">
                      Morale {record.appliedEffect.previousValue} → {record.appliedEffect.currentValue}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 border border-[#E8E8D8]/20 p-2 text-[10px] leading-snug text-[#E8E8D8]/65">
                {record.narrativeReadableStatus}
              </div>
              {entry.warnings.length > 0 && (
                <div className="mt-2 text-[10px] leading-snug text-[#FFD27A]">
                  {entry.warnings.join(' ')}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={record.confirmation.state !== 'unconfirmed' || actionId === record.id}
                  onClick={() => onConfirm(record.id)}
                  className="border-2 border-[#C4A853] bg-[#6B9462] px-3 py-1 text-[10px] font-bold text-[#E8E8D8] hover:bg-[#5A8352] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  CONFIRM
                </button>
                <button
                  type="button"
                  disabled={record.confirmation.state !== 'unconfirmed' || actionId === record.id}
                  onClick={() => onDismiss(record.id)}
                  className="border-2 border-[#E8E8D8]/30 bg-[#5A3F3F] px-3 py-1 text-[10px] font-bold text-[#E8E8D8] hover:border-[#C4A853] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  DISMISS
                </button>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3 text-[10px] leading-snug text-[#E8E8D8]/65">
          No durable random-event prompt records are available yet. This panel does not fabricate events when scoped evidence is missing.
        </div>
      )}

      <div className="mt-3 border-2 border-[#4A6844] bg-[#5A3F3F] p-2 text-[10px] leading-snug text-[#FFD6D6]">
        V1 boundary: confirmations persist to the random-event log and can apply scoped morale only. They do not edit profiles, relationships, salary, stories, park factors, designations, or offseason systems.
      </div>
    </section>
  );
}

function FranchiseValueTruthPanel({
  selectedTeamId,
  salaryLifecycleReport,
  designationEligibilityReport,
  projectedDesignationRows,
  isLoading,
  error,
}: FranchiseValueTruthPanelProps) {
  const salaryRecords = (salaryLifecycleReport?.playerRecords ?? []).filter((record) =>
    !selectedTeamId || record.teamId === selectedTeamId,
  );
  const teamPayrollRecord = salaryLifecycleReport?.teamRecords.find((record) => record.teamId === selectedTeamId);
  const stableSalaryCount = salaryRecords.filter((record) => record.initialSalaryBaseline.status === 'stable-baseline').length;
  const blockedSalaryCount = salaryRecords.filter((record) => record.initialSalaryBaseline.status === 'blocked').length;
  const playerSalaryBaselineLabel = stableSalaryCount > 0 && blockedSalaryCount > 0
    ? `PARTIAL (${stableSalaryCount} stable / ${blockedSalaryCount} missing)`
    : stableSalaryCount > 0
      ? `STABLE BASELINE (${stableSalaryCount} current team players)`
      : 'BLOCKED';
  const performanceStatus = salaryRecords[0]?.performanceSalaryMovement.status ?? 'blocked';
  const offseasonStatus = salaryRecords[0]?.offseasonSalaryRecalculation.status ?? 'deferred';
  const salaryLimitations = uniqueStrings([
    ...salaryRecords.flatMap((record) => record.limitations),
    ...(teamPayrollRecord?.limitations ?? []),
  ]).slice(0, 4);

  const designationRecords = (designationEligibilityReport?.records ?? []).filter((record) =>
    !selectedTeamId || record.teamId === selectedTeamId,
  );
  const activeDesignationLabels = uniqueStrings(
    projectedDesignationRows
      .filter((record) => record.status === 'active' && (!selectedTeamId || record.teamId === selectedTeamId))
      .map((record) => (getLiveDesignationBadge(record.type) ?? getProjectedDesignationBadge(record.type)).label),
  );
  const projectedDesignationLabels = uniqueStrings(
    projectedDesignationRows
      .filter((record) => record.status === 'projected' && (!selectedTeamId || record.teamId === selectedTeamId))
      .map((record) => getProjectedDesignationBadge(record.type).label),
  );
  const blockedDesignationSummaries = uniqueStrings(
    designationRecords
      .filter((record) => record.status === 'blocked')
      .filter((record) => ['CAPTAIN', 'FAN_HOPEFUL', 'CORNERSTONE'].includes(record.designationType))
      .map((record) => `${record.designationType} ${record.status}: ${record.reasons[0]}`),
  ).slice(0, 5);

  return (
    <section
      data-testid="franchise-v1-roster-value-gate"
      role="region"
      aria-label="Franchise v1 value salary designation truth labels"
      className="mb-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">VALUE / SALARY / DESIGNATION TRUTH</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
            Franchise v1 salary values are current salary state. Morale, True Value, and value-delta columns remain deferred until canonical inputs exist.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[8px] text-[#E8E8D8]">
          {isLoading ? 'LOADING' : 'READ ONLY'}
        </div>
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#DD0000]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/75">
          <div className="mb-1 font-bold text-[#C4A853]">CURRENT SALARY</div>
          <div>
            Player salary state: {playerSalaryBaselineLabel}
          </div>
          {blockedSalaryCount > 0 && (
            <div>Missing salary baseline: {blockedSalaryCount} players</div>
          )}
          <div>
            Team payroll proof: {teamPayrollRecord
              ? formatTruthStatus(teamPayrollRecord.payrollBaselineState.status)
              : 'BLOCKED'}
          </div>
          {teamPayrollRecord?.payrollBaseline == null && (
            <div className="text-[#FFEFB5]">Team payroll proof limitation: missing handoff payroll proof.</div>
          )}
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/75">
          <div className="mb-1 font-bold text-[#C4A853]">VALUE MOVEMENT</div>
          <div>Performance salary formula: {formatTruthStatus(performanceStatus)}</div>
          <div>Offseason salary recalculation: {formatTruthStatus(offseasonStatus)}</div>
          <div>True Value / value delta: TRUSTED for projected designations only.</div>
          <div>Luxury tax, salary matching, and AI salary valuation: BLOCKED / INACTIVE.</div>
        </div>

        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-2 text-[8px] text-[#E8E8D8]/75">
          <div className="mb-1 font-bold text-[#C4A853]">DYNAMIC DESIGNATIONS</div>
          {activeDesignationLabels.length > 0 && (
            <div>{activeDesignationLabels.join(', ')} live canonical designation(s); morale, salary, awards, and relationship effects are not applied.</div>
          )}
          {projectedDesignationLabels.length > 0 ? (
            <div>{projectedDesignationLabels.join(', ')} canonical projected designation(s); season-end locking and carryover remain blocked.</div>
          ) : (
            <div>{activeDesignationLabels.length > 0 ? 'No mid-season projection rows for the current inputs.' : 'No projected designation rows for the current inputs.'}</div>
          )}
          <div>Designation persistence: PROJECTED rows only for non-live rows; TEAM_MVP/ACE can be ACTIVE.</div>
          <div>Captain, Fan Hopeful, season-end locks, morale effects, and trade discounts remain blocked.</div>
        </div>
      </div>

      {(blockedDesignationSummaries.length > 0 || salaryLimitations.length > 0) && (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {blockedDesignationSummaries.length > 0 && (
            <div className="border-2 border-[#4A6844] bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
              <div className="mb-1 font-bold text-[#FFEFB5]">Blocked / deferred designation reasons</div>
              {blockedDesignationSummaries.map((summary) => (
                <div key={summary}>{summary}</div>
              ))}
            </div>
          )}
          {salaryLimitations.length > 0 && (
            <div className="border-2 border-[#4A6844] bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
              <div className="mb-1 font-bold text-[#FFEFB5]">Salary context limitations</div>
              {salaryLimitations.map((limitation) => (
                <div key={limitation}>{limitation}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-[8px] text-[#E8E8D8]/55">
        The roster scan is read-only and shows safe salary, morale, stats, and projected canonical designation context only.
      </div>
    </section>
  );
}

function FranchiseTransactionHistoryPanel({
  transactions,
  isLoading,
  error,
}: FranchiseTransactionHistoryPanelProps) {
  return (
    <section
      role="region"
      aria-label="Read-only franchise transaction history"
      className="mb-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">READ-ONLY TRANSACTION HISTORY</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
            Roster & Trades remains the canonical mutation surface. This panel only reads scoped trades, call-ups, and send-downs.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[8px] text-[#E8E8D8]">
          {transactions.length} LOGGED
        </div>
      </div>

      {isLoading && (
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3 text-[8px] text-[#E8E8D8]/65">
          Loading scoped transaction history...
        </div>
      )}

      {!isLoading && error && (
        <div className="border-2 border-[#C4A853]/50 bg-[#5A3F3F] p-3 text-[8px] text-[#FFD6D6]">
          {error}
        </div>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3 text-[8px] text-[#E8E8D8]/65">
          No scoped trade, call-up, or send-down rows have been logged for this franchise season.
        </div>
      )}

      {!isLoading && !error && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((entry) => (
            <div key={entry.id} className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold text-[#E8E8D8]">{formatTeamHubTransactionType(entry.type)}</div>
                  <div className="mt-1 text-[7px] text-[#E8E8D8]/55">
                    {entry.id} / {formatTeamHubTransactionTimestamp(entry.timestamp)}
                  </div>
                </div>
                <div className="border-2 border-[#5A8352] px-2 py-1 text-[7px] font-bold text-[#C4A853]">
                  {entry.phase}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-[8px] text-[#E8E8D8]/75 md:grid-cols-3">
                <div>
                  <div className="text-[#E8E8D8]/50">Players</div>
                  <div>{describeTeamHubTransactionPlayers(entry)}</div>
                </div>
                <div>
                  <div className="text-[#E8E8D8]/50">Teams</div>
                  <div>{describeTeamHubTransactionTeams(entry)}</div>
                </div>
                <div>
                  <div className="text-[#E8E8D8]/50">Status</div>
                  <div>{describeTeamHubTransactionStatuses(entry)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DirectorySelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[8px] font-bold text-[#C4A853]">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-10 w-full border-2 border-[#4A6844] bg-[#5A8352] px-2 py-2 text-[10px] text-[#E8E8D8]"
      >
        {children}
      </select>
    </label>
  );
}

function FranchisePlayerDirectoryPanel({
  rows,
  totalCount,
  teamOptions,
  positionOptions,
  search,
  teamFilter,
  rosterFilter,
  positionFilter,
  revealFilter,
  sort,
  onSearchChange,
  onTeamFilterChange,
  onRosterFilterChange,
  onPositionFilterChange,
  onRevealFilterChange,
  onSortChange,
  onOpenProfile,
}: FranchisePlayerDirectoryPanelProps) {
  return (
    <section
      role="region"
      aria-label="Franchise player directory"
      className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-[#E8E8D8]">FRANCHISE PLAYER DIRECTORY</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
            Read-only franchise-owned players. Hidden FARM rows use visible scouting grades only.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-3 py-2 text-[9px] text-[#E8E8D8]">
          {rows.length} / {totalCount} PLAYERS
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="block md:col-span-2 xl:col-span-1">
          <span className="block text-[8px] font-bold text-[#C4A853]">SEARCH PLAYER NAME</span>
          <input
            aria-label="Search player name"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Type a player name..."
            className="mt-1 min-h-10 w-full border-2 border-[#4A6844] bg-[#5A8352] px-3 py-2 text-[10px] text-[#E8E8D8] placeholder:text-[#E8E8D8]/35"
          />
        </label>
        <DirectorySelect label="TEAM FILTER" value={teamFilter} onChange={onTeamFilterChange}>
          <option value="ALL">All teams</option>
          {teamOptions.map((team) => (
            <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
          ))}
        </DirectorySelect>
        <DirectorySelect
          label="ROSTER STATUS"
          value={rosterFilter}
          onChange={(value) => onRosterFilterChange(value as FranchiseDirectoryRosterFilter)}
        >
          <option value="ALL">All statuses</option>
          <option value="MLB">MLB</option>
          <option value="FARM">FARM</option>
          <option value="FREE_AGENT">Free agent</option>
          <option value="UNASSIGNED">Unassigned / unknown</option>
        </DirectorySelect>
        <DirectorySelect label="POSITION" value={positionFilter} onChange={onPositionFilterChange}>
          {positionOptions.map((position) => (
            <option key={position} value={position}>
              {position === 'ALL' ? 'All positions' : position === 'FIELDERS' ? 'Fielders' : position === 'PITCHERS' ? 'Pitchers' : position}
            </option>
          ))}
        </DirectorySelect>
        <DirectorySelect
          label="REVEAL STATE"
          value={revealFilter}
          onChange={(value) => onRevealFilterChange(value as FranchiseDirectoryRevealFilter)}
        >
          <option value="ALL">Hidden and revealed</option>
          <option value="HIDDEN">Hidden prospects</option>
          <option value="REVEALED">Revealed players</option>
        </DirectorySelect>
        <DirectorySelect
          label="SORT BY"
          value={sort}
          onChange={(value) => onSortChange(value as FranchiseDirectorySort)}
        >
          <option value="name">Name</option>
          <option value="team">Team</option>
          <option value="rosterStatus">Roster status</option>
          <option value="position">Position</option>
          <option value="grade">Grade / scouted grade</option>
        </DirectorySelect>
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-4 text-[9px] text-[#E8E8D8]/65">
          No franchise-owned players match the current directory filters.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.playerId}
              className="border-[4px] border-[#4A6844] bg-[#5A8352] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-[#E8E8D8]">{row.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[8px] text-[#E8E8D8]/70">
                    <span>{row.teamName}</span>
                    <span>•</span>
                    <span>{row.rosterStatus}</span>
                    <span>•</span>
                    <span>{row.positionLabel}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="border-2 border-[#4A6844] bg-[#4A6844] px-2 py-1 text-[8px] font-bold text-[#C4A853]">
                      {row.revealState.toUpperCase()}
                    </span>
                    <span className="border-2 border-[#4A6844] bg-[#4A6844] px-2 py-1 text-[8px] text-[#E8E8D8]">
                      {row.gradeLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Open profile for ${row.name}`}
                  onClick={() => onOpenProfile(row.playerId)}
                  className="min-h-10 border-2 border-[#E8E8D8]/30 bg-[#4A6844] px-4 py-2 text-[9px] font-bold text-[#E8E8D8] hover:border-[#C4A853]"
                >
                  PROFILE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FranchiseFarmVisibilityPanel({
  farmPlayers,
  farmRecordByPlayerId,
  missingRecordPlayers,
  orphanFarmRecords,
  onOpenProfile,
}: FranchiseFarmVisibilityPanelProps) {
  return (
    <div
      role="region"
      aria-label="Franchise FARM prospects"
      className="mt-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">FARM PROSPECTS</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
            Read-only. FARM players are not available for GameTracker until moved through roster transaction flows.
          </div>
        </div>
        <div className="border-2 border-[#4A6844] bg-[#5A8352] px-2 py-1 text-[8px] text-[#E8E8D8]">
          {farmPlayers.length} FARM
        </div>
      </div>

      {farmPlayers.length === 0 ? (
        <div className="border-2 border-[#4A6844] bg-[#4A6844] p-3 text-[8px] text-[#E8E8D8]/65">
          No FARM players are assigned to this franchise team.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {farmPlayers.map((player) => {
            const record = farmRecordByPlayerId.get(player.id);
            const metadata = prospectMetadata(player);
            const traits = [player.trait1, player.trait2].filter(Boolean).join(', ') || 'None';
            const revealState = resolveFranchiseSalaryRevealState(
              {
                ...player,
                ratingRevealState: player.ratingRevealState === 'revealed'
                  ? 'revealed'
                  : record?.ratingRevealState ?? player.ratingRevealState,
              },
              'FARM',
            );
            return (
              <div key={player.id} className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#E8E8D8]">{getFranchisePlayerName(player)}</div>
                    <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
                      {player.primaryPosition} · Age {player.age} · B/T {player.bats}/{player.throws}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="border-2 border-[#5A8352] px-2 py-1 text-[7px] font-bold text-[#C4A853]">
                      {String(revealState).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      aria-label={`Open profile for ${getFranchisePlayerName(player)}`}
                      onClick={() => onOpenProfile(player.id)}
                      className="border-2 border-[#E8E8D8]/25 bg-[#5A8352] px-2 py-1 text-[7px] font-bold text-[#E8E8D8] hover:border-[#C4A853]"
                    >
                      PROFILE
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8px] text-[#E8E8D8]/75">
                  <div>Scouted: <span className="font-bold text-[#E8E8D8]">{metadata.scoutedGrade ?? 'Unscouted'}</span></div>
                  <div>Potential: <span className="font-bold text-[#E8E8D8]">{metadata.potentialGrade ?? 'Unknown'}</span></div>
                  <div>Confidence: {metadata.scoutConfidence ?? 'Unknown'}</div>
                  <div>Salary: {formatFarmSalary(player)}</div>
                  <div>Chemistry: {player.chemistry ?? '—'}</div>
                  <div>Personality: {player.personality ?? '—'}</div>
                  <div className="col-span-2">Traits: {traits}</div>
                  <div>Options used: {record?.optionsUsed ?? 'Missing record'}</div>
                  <div>Option dates: {record ? formatFarmOptionDates(record.optionDates) : 'Missing record'}</div>
                  <div className="col-span-2">
                    Source: {metadata.source ?? player.sourceDatabase ?? 'Unknown'}
                    {metadata.draftRound ? ` · Round ${metadata.draftRound}` : ''}
                    {metadata.draftPick ? ` · Pick ${metadata.draftPick}` : ''}
                  </div>
                </div>

                {!record && (
                  <div className="mt-2 border-2 border-[#C4A853]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
                    FARM record missing for {getFranchisePlayerName(player)}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(missingRecordPlayers.length > 0 || orphanFarmRecords.length > 0) && (
        <div className="mt-3 space-y-2">
          {missingRecordPlayers.map((player) => (
            <div key={`missing-${player.id}`} className="border-2 border-[#C4A853]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
              Missing FARM record for FARM-assigned player {getFranchisePlayerName(player)}.
            </div>
          ))}
          {orphanFarmRecords.map((record) => (
            <div key={`orphan-${record.id}`} className="border-2 border-[#C4A853]/50 bg-[#5A3F3F] p-2 text-[8px] text-[#FFD6D6]">
              FARM record exists without matching player: {record.playerId}.
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FranchiseRosterAnalyzerPanel({ report }: FranchiseRosterAnalyzerPanelProps) {
  if (!report) return null;

  const visibleFindings = report.findings
    .filter((finding) => finding.severity !== 'info' || finding.kind !== 'data_integrity')
    .slice(0, 3);
  const limitations = report.profile.limitations.slice(0, 3);
  const farmAdvice = report.recommendations
    .filter((recommendation) =>
      recommendation.kind === 'farm_monitor' ||
      recommendation.kind === 'call_up_advice' ||
      recommendation.kind === 'send_down_advice',
    )
    .slice(0, 2);
  const advisoryCount = report.recommendations.filter((recommendation) =>
    recommendation.execution === 'read_only' || recommendation.execution === 'blocked_future_work',
  ).length;

  return (
    <div className="mb-4 border-[4px] border-[#4A6844] bg-[#3F563F] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold text-[#C4A853]">READ-ONLY ROSTER ANALYZER</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
            Advisory only. No call-ups, send-downs, or roster writes are executed here.
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-bold">
            <span className="border-2 border-[#E8E8D8]/25 bg-[#2d3d2f] px-2 py-1">
              MLB {report.profile.activeCount}
            </span>
            <span className="border-2 border-[#E8E8D8]/25 bg-[#2d3d2f] px-2 py-1">
              FARM {report.profile.farmCount}
            </span>
            <span className="border-2 border-[#E8E8D8]/25 bg-[#2d3d2f] px-2 py-1">
              TRUST {report.trust.overall.toUpperCase()}
            </span>
            <span className="border-2 border-[#E8E8D8]/25 bg-[#2d3d2f] px-2 py-1">
              ADVICE {advisoryCount}
            </span>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 text-[8px]">
          {visibleFindings.length > 0 ? (
            <div className="space-y-1">
              {visibleFindings.map((finding) => (
                <div key={finding.id} className="text-[#E8E8D8]">
                  <span className="font-bold text-[#FFD166]">{finding.severity.toUpperCase()}</span>
                  <span className="text-[#E8E8D8]/80"> · {finding.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="font-bold text-[#A7F3D0]">No critical readiness issues found.</div>
          )}
          {limitations.length > 0 && (
            <div className="mt-2 text-[#E8E8D8]/60">
              {limitations.join(' ')}
            </div>
          )}
          {farmAdvice.length > 0 && (
            <div className="mt-2 border-t border-[#E8E8D8]/20 pt-2">
              <div className="mb-1 font-bold text-[#C4A853]">Farm advisory only</div>
              {farmAdvice.map((recommendation) => (
                <div key={recommendation.id} className="text-[#E8E8D8]/75">
                  {recommendation.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
