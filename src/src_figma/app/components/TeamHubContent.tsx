import { useState, useMemo, useEffect } from "react";
import { Edit, Building2, User } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../../hooks/useSeasonStats';
import { useFranchiseDataContext } from "@/app/pages/FranchiseHome";
import {
  getAllFranchisePlayers,
  getFranchiseTeam,
  saveFranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import {
  getFranchiseFarmRoster,
  type FranchiseFarmRecord,
} from "../../../utils/franchiseFarmStorage";
import { getSeasonIdForScope } from "../../../utils/franchisePersistenceContract";
import {
  getTransactionsByFranchiseSeason,
  type Mode2V1TransactionType,
  type TransactionLogEntry,
} from "../../../utils/transactionStorage";
import { analyzeFranchiseTeamRoster } from "../../../utils/rosterAnalyzerFranchiseAdapter";
import type {
  LineupSlot,
  Player,
  Position,
  Team,
} from "../../../utils/leagueBuilderStorage";
import type { RosterAnalyzerReport } from "../../../engines/rosterAnalyzerEngine";
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

type TeamHubTab = "team" | "fan-morale" | "roster" | "stats" | "stadium" | "manager";

// Empty fallbacks — populated from real data when available
const EMPTY_TEAMS: string[] = [];
const EMPTY_STADIUMS: string[] = [];

const EMPTY_ROSTER_DATA: { name: string; position: string; grade: string; morale: string | number; contract: string; trueValue: string; netDiff: string; fitness: string | number }[] = [];

const EMPTY_STATS_DATA: { name: string; pos: string; war: number; pwar: number; bwar: number; rwar: number; fwar: number; era?: number; ip?: number; k?: number; w?: number; l?: number; sv?: number; avg?: number; hr?: number; rbi?: number; sb?: number; ops?: number }[] = [];
const FRANCHISE_FIELD_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
const FRANCHISE_PITCHER_POSITIONS = new Set<Position>(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);
const FRANCHISE_ROTATION_POSITIONS = new Set<Position>(['SP', 'SP/RP']);
const FRANCHISE_TEAM_HUB_HISTORY_TYPES = new Set<Mode2V1TransactionType>([
  'trade',
  'call_up',
  'send_down',
]);

// Helper to convert OffseasonPlayer to roster format
function convertToRosterItem(player: OffseasonPlayer) {
  const salary = player.salary || 0;
  const contractStr = salary > 0 ? `$${(salary / 1000000).toFixed(1)}M` : '—';

  return {
    name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
    position: player.position,
    grade: player.grade,
    morale: '—' as string | number,
    contract: contractStr,
    trueValue: '—',
    netDiff: '—',
    fitness: '—' as string | number,
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
  const salary = Number(player.salary) || 0;
  if (salary <= 0) return '—';
  return salary >= 10000 ? `$${(salary / 1000000).toFixed(1)}M` : `$${salary.toFixed(1)}M`;
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

function convertFranchisePlayerToRosterItem(player: Player) {
  const salary = player.salary || 0;
  const contractStr = salary > 0 ? `$${(salary / 1000000).toFixed(1)}M` : '—';

  return {
    name: formatFranchiseShortName(player),
    position: player.primaryPosition,
    grade: player.overallGrade,
    morale: typeof player.morale === 'number' ? player.morale : '—',
    contract: contractStr,
    trueValue: '—',
    netDiff: '—',
    fitness: '—' as string | number,
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
    mojo: player.mojo,
    trait1: player.trait1,
    trait2: player.trait2,
    unavailable: false,
  };
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
  const [rosterSortColumn, setRosterSortColumn] = useState<string>("name");
  const [rosterSortDirection, setRosterSortDirection] = useState<"asc" | "desc">("asc");
  const [statsSortColumn, setStatsSortColumn] = useState<string>("war");
  const [statsSortDirection, setStatsSortDirection] = useState<"asc" | "desc">("desc");
  const [franchiseTeam, setFranchiseTeam] = useState<Team | null>(null);
  const [franchiseAllPlayers, setFranchiseAllPlayers] = useState<Player[]>([]);
  const [franchiseRosterPlayers, setFranchiseRosterPlayers] = useState<Player[]>([]);
  const [franchiseFarmRecords, setFranchiseFarmRecords] = useState<FranchiseFarmRecord[]>([]);
  const [franchiseTransactionHistory, setFranchiseTransactionHistory] = useState<TransactionLogEntry[]>([]);
  const [transactionHistoryLoading, setTransactionHistoryLoading] = useState(false);
  const [transactionHistoryError, setTransactionHistoryError] = useState<string | null>(null);
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
      generatedAt: 'franchise-team-hub',
    });
  }, [
    franchiseAllPlayers,
    franchiseFarmRecords,
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

  // Default to first team once data loads
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
      setSelectedStadium(stadiums[0] || teams[0]);
    }
  }, [teams, stadiums, selectedTeam]);

  // Get roster for selected team
  const rosterData = useMemo(() => {
    if (franchiseId && selectedTeamId) {
      return franchiseRosterPlayers.map((player) => convertFranchisePlayerToRosterItem(player));
    }
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      const selectedTeamObj = realTeams.find(t => t.name === selectedTeam);
      if (selectedTeamObj) {
        const teamPlayers = realPlayers.filter(p => p.teamId === selectedTeamObj.id).slice(0, 15);
        if (teamPlayers.length > 0) {
          return teamPlayers.map(p => convertToRosterItem(p));
        }
      }
    }
    return EMPTY_ROSTER_DATA;
  }, [franchiseId, selectedTeamId, franchiseRosterPlayers, realPlayers, realTeams, selectedTeam, hasRealData]);

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
  const handleRosterSort = (column: string) => {
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
    const sorted = [...rosterData].sort((a, b) => {
      let aVal: any = a[rosterSortColumn as keyof typeof a];
      let bVal: any = b[rosterSortColumn as keyof typeof b];

      // Handle numeric string values
      if (typeof aVal === "string" && aVal.includes("$")) {
        aVal = parseFloat(aVal.replace(/[$M]/g, ""));
        bVal = parseFloat(bVal.replace(/[$M]/g, ""));
      }

      if (aVal < bVal) return rosterSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return rosterSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
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
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
          <div className="text-center">
            <div className="text-[24px] text-[#E8E8D8]/30 mb-4">📊</div>
            <div className="text-[12px] text-[#E8E8D8]/50 mb-2">FAN MORALE</div>
            <div className="text-[10px] text-[#E8E8D8]/40">
              Fan morale mutation is deferred in Franchise v1.
            </div>
          </div>
        </div>
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
          
          <div
            data-testid="franchise-v1-roster-value-gate"
            className="mb-3 border-2 border-[#4A6844] bg-[#3F563F] p-2 text-[8px] text-[#E8E8D8]/65"
          >
            Morale, True Value, and value-delta columns are deferred until those franchise calculations are canonical.
            The v1 roster table shows stable identity, grade, contract, fitness, and lineup controls only.
          </div>

          <div className="overflow-x-auto">
            <table aria-label="MLB roster table" className="w-full text-[9px]">
              <thead>
                <tr className="border-b-2 border-[#4A6844]">
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("name")}>
                    NAME {rosterSortColumn === "name" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("position")}>
                    POS {rosterSortColumn === "position" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("grade")}>
                    GRADE {rosterSortColumn === "grade" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("contract")}>
                    CONTRACT {rosterSortColumn === "contract" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("fitness")}>
                    FITNESS {rosterSortColumn === "fitness" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70">EDIT</th>
                </tr>
              </thead>
              <tbody>
                {getSortedRoster().map((player, idx) => (
                  <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? 'bg-[#5A8352]/20' : ''}`}>
	                    <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
	                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.position}</td>
	                    <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.grade}</td>
	                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.contract}</td>
	                    <td className="py-2 px-2 text-center">
	                      <span className={typeof player.fitness === 'number' ? (player.fitness >= 90 ? "text-[#00DD00]" : player.fitness >= 80 ? "text-[#E8E8D8]" : "text-[#DD0000]") : "text-[#E8E8D8]/50"}>
	                        {player.fitness}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        disabled
                        title="Roster edits use the Franchise roster and transaction surfaces."
                        className="p-1 opacity-40 cursor-not-allowed"
                      >
                        <Edit className="w-3 h-3 text-[#E8E8D8]" />
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
          />
        </div>
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
                SPRAY CHARTS DEFERRED
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
              <div className="text-[12px] text-[#E8E8D8]/50 mb-2">SPRAY CHARTS DEFERRED</div>
              <div className="text-[10px] text-[#E8E8D8]/40">
                Franchise v1 does not display fabricated batted-ball distributions or advanced contact metrics.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stadiums Tab */}
      {activeHubTab === "stadium" && (
        <div className="space-y-4">
          {/* Stadium Selection */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div className="text-[10px] text-[#E8E8D8]/70 mb-2">SELECT STADIUM</div>
            <select
              value={selectedStadium}
              onChange={(e) => setSelectedStadium(e.target.value)}
              className="w-full bg-[#4A6844] text-[#E8E8D8] p-2 text-[10px] border-2 border-[#3F5A3A]"
            >
              {stadiums.map((stadium) => (
                <option key={stadium} value={stadium}>
                  {stadium}
                </option>
              ))}
            </select>
          </div>

          {/* Empty state — park factors/records not yet tracked */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-[#E8E8D8]/30 mx-auto mb-4" />
              <div className="text-[12px] text-[#E8E8D8]/50 mb-2">{selectedStadium || 'STADIUM'}</div>
              <div className="text-[10px] text-[#E8E8D8]/40">
                Seeded stadium identity is read-only. Custom park factors are deferred in Franchise v1.
              </div>
            </div>
          </div>
        </div>
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

interface FranchiseFarmVisibilityPanelProps {
  farmPlayers: Player[];
  farmRecordByPlayerId: Map<string, FranchiseFarmRecord>;
  missingRecordPlayers: Player[];
  orphanFarmRecords: FranchiseFarmRecord[];
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

function FranchiseFarmVisibilityPanel({
  farmPlayers,
  farmRecordByPlayerId,
  missingRecordPlayers,
  orphanFarmRecords,
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
            const revealState = record?.ratingRevealState ?? player.ratingRevealState ?? 'hidden';
            return (
              <div key={player.id} className="border-2 border-[#4A6844] bg-[#4A6844] p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#E8E8D8]">{getFranchisePlayerName(player)}</div>
                    <div className="mt-1 text-[8px] text-[#E8E8D8]/65">
                      {player.primaryPosition} · Age {player.age} · B/T {player.bats}/{player.throws}
                    </div>
                  </div>
                  <div className="border-2 border-[#5A8352] px-2 py-1 text-[7px] font-bold text-[#C4A853]">
                    {String(revealState).toUpperCase()}
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
    .filter((recommendation) => recommendation.kind === 'farm_monitor')
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
