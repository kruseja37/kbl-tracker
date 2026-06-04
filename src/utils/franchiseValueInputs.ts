import { getFranchiseConfig } from './franchiseManager';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  getAllBattingStats,
  getAllFieldingStats,
  getAllPitchingStats,
  getSeasonMetadata,
  type PlayerSeasonBatting,
  type PlayerSeasonFielding,
  type PlayerSeasonPitching,
} from './seasonStorage';
import { getAllGamesByFranchise } from './scheduleStorage';
import { getRecentGames } from './gameStorage';

export const FRANCHISE_VALUE_INPUT_CONTRACT_VERSION = 'franchise-mode2-value-inputs-v1-readonly';

export type FranchiseValueParkFactorStatus = 'seed-only' | 'custom-unavailable' | 'unadjusted';

export interface FranchiseWarPreviewValues {
  battingWar: number | null;
  pitchingWar: number | null;
  fieldingWar: number | null;
  baserunningWar: number | null;
  totalWar: number | null;
  totalWarSource: 'stat-row' | 'derived-from-components' | 'unavailable';
  trustedForFinalValue: false;
}

export interface FranchiseValueInputSeasonContext {
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  gamesPerTeam: number | null;
  inningsPerGame: number | null;
  seasonLengthSource: 'stored-franchise-config' | 'missing';
  scheduleRowCount: number;
  scheduleRowsUsedAsSeasonLength: false;
  seasonMetadataTotalGames: number | null;
}

export interface FranchiseValueInputRow {
  contractVersion: typeof FRANCHISE_VALUE_INPUT_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  currentTeamId: string | null;
  rosterStatus: string | null;
  salary: number | null;
  contractYears: number | null;
  salaryBaselineCalculationVersion: string | null;
  teamSalaryBaseline: number | null;
  salaryBaselineAvailable: boolean;
  seasonStatsAvailability: {
    batting: boolean;
    pitching: boolean;
    fielding: boolean;
    any: boolean;
  };
  warInputAvailability: {
    battingWar: boolean;
    pitchingWar: boolean;
    fieldingWar: boolean;
    baserunningWar: boolean;
    any: boolean;
    trustedForFinalValue: false;
  };
  warPreviewValues: FranchiseWarPreviewValues;
  wpaInputAvailability: {
    playerWpa: boolean;
    managerWpa: boolean;
    archiveBacked: boolean;
    trustedForFinalValue: false;
  };
  seasonContext: FranchiseValueInputSeasonContext;
  stadiumId: string | null;
  parkFactorAvailability: {
    stadiumIdAvailable: boolean;
    seedParkFactorsAvailable: boolean;
    customParkFactorsAvailable: false;
    status: FranchiseValueParkFactorStatus;
    parkAdjustedValueInputsAvailable: boolean;
  };
  limitations: string[];
}

export interface FranchiseValueInputReport {
  contractVersion: typeof FRANCHISE_VALUE_INPUT_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  generatedAt: number;
  seasonContext: FranchiseValueInputSeasonContext;
  rows: FranchiseValueInputRow[];
  trueValuePolicy: {
    finalTrueValueCalculated: false;
    persistedTrueValueCreated: false;
  };
  designationPolicy: {
    finalDesignationsCalculated: false;
    persistedDesignationRecordsCreated: false;
    inventedDesignationTypes: string[];
  };
  limitations: string[];
}

export interface BuildFranchiseValueInputRowsInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteOrNull(value: unknown): number | null {
  return finiteNumber(value) ? value : null;
}

function playerName(player: Player): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function findCurrentAssignment(player: Player, leagueId: string | null) {
  const assignments = player.leagueAssignments ?? [];
  return assignments.find((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.teamId &&
    assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? assignments.find((assignment) =>
    assignment.teamId &&
    assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? null;
}

function getStadiumSnapshot(config: Awaited<ReturnType<typeof getFranchiseConfig>>, teamId: string | null) {
  if (!config || !teamId) return undefined;
  return config.stadiums?.find((snapshot) => snapshot.teamId === teamId);
}

function teamHasSeedParkFactors(team: Team | undefined, stadiumSnapshot: ReturnType<typeof getStadiumSnapshot>): boolean {
  return Boolean(team?.parkFactors || stadiumSnapshot?.hasSeedParkFactors);
}

function buildSeasonContext(
  input: BuildFranchiseValueInputRowsInput,
  gamesPerTeam: number | null,
  inningsPerGame: number | null,
  scheduleRowCount: number,
  seasonMetadataTotalGames: number | null,
): FranchiseValueInputSeasonContext {
  return {
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId ?? input.seasonId,
    seasonNumber: input.seasonNumber,
    gamesPerTeam,
    inningsPerGame,
    seasonLengthSource: gamesPerTeam !== null || inningsPerGame !== null ? 'stored-franchise-config' : 'missing',
    scheduleRowCount,
    scheduleRowsUsedAsSeasonLength: false,
    seasonMetadataTotalGames,
  };
}

function mapByPlayerId<T extends { playerId: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

function hasBattingWarInput(batting?: PlayerSeasonBatting): boolean {
  return Boolean(batting && (
    finiteNumber(batting.bwar) ||
    finiteNumber(batting.totalWar) ||
    batting.pa > 0
  ));
}

function hasPitchingWarInput(pitching?: PlayerSeasonPitching): boolean {
  return Boolean(pitching && (
    finiteNumber(pitching.pwar) ||
    pitching.outsRecorded > 0 ||
    pitching.games > 0
  ));
}

function hasFieldingWarInput(fielding?: PlayerSeasonFielding, batting?: PlayerSeasonBatting): boolean {
  return Boolean(
    finiteNumber(batting?.fwar) ||
    (fielding && (fielding.games > 0 || fielding.putouts > 0 || fielding.assists > 0 || fielding.errors > 0)),
  );
}

function hasBaserunningWarInput(batting?: PlayerSeasonBatting): boolean {
  return Boolean(batting && (
    finiteNumber(batting.rwar) ||
    batting.stolenBases > 0 ||
    batting.caughtStealing > 0 ||
    batting.gidp > 0
  ));
}

function buildWarPreviewValues(
  batting?: PlayerSeasonBatting,
  pitching?: PlayerSeasonPitching,
): FranchiseWarPreviewValues {
  const battingWar = finiteOrNull(batting?.bwar);
  const pitchingWar = finiteOrNull(pitching?.pwar);
  const fieldingWar = finiteOrNull(batting?.fwar);
  const baserunningWar = finiteOrNull(batting?.rwar);
  const statRowTotalWar = finiteOrNull(batting?.totalWar);

  if (statRowTotalWar !== null) {
    return {
      battingWar,
      pitchingWar,
      fieldingWar,
      baserunningWar,
      totalWar: statRowTotalWar,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    };
  }

  const components = [battingWar, pitchingWar, fieldingWar, baserunningWar]
    .filter((value): value is number => value !== null);

  return {
    battingWar,
    pitchingWar,
    fieldingWar,
    baserunningWar,
    totalWar: components.length > 0
      ? Number(components.reduce((sum, value) => sum + value, 0).toFixed(3))
      : null,
    totalWarSource: components.length > 0 ? 'derived-from-components' : 'unavailable',
    trustedForFinalValue: false,
  };
}

function hasWarPreviewValue(values: FranchiseWarPreviewValues): boolean {
  return values.battingWar !== null ||
    values.pitchingWar !== null ||
    values.fieldingWar !== null ||
    values.baserunningWar !== null ||
    values.totalWar !== null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function hasTeamPayrollBaseline(
  config: Awaited<ReturnType<typeof getFranchiseConfig>>,
  teamId: string | null,
): boolean {
  return Boolean(teamId && finiteNumber(config?.salaryBaseline?.teamPayrolls?.[teamId]));
}

export async function buildFranchiseValueInputRows(
  input: BuildFranchiseValueInputRowsInput,
): Promise<FranchiseValueInputReport> {
  const statsScopeId = input.statsScopeId ?? input.seasonId;
  const [
    config,
    players,
    teams,
    battingStats,
    pitchingStats,
    fieldingStats,
    seasonMetadata,
    scheduleRows,
    completedGames,
  ] = await Promise.all([
    getFranchiseConfig(input.franchiseId),
    getAllFranchisePlayers(input.franchiseId),
    getAllFranchiseTeams(input.franchiseId),
    getAllBattingStats(statsScopeId),
    getAllPitchingStats(statsScopeId),
    getAllFieldingStats(statsScopeId),
    getSeasonMetadata(statsScopeId),
    getAllGamesByFranchise(input.franchiseId, input.seasonNumber),
    getRecentGames(500, {
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId,
    }),
  ]);

  const gamesPerTeam = finiteNumber(config?.seasonLength?.gamesPerTeam)
    ? config.seasonLength.gamesPerTeam
    : finiteNumber(config?.season?.gamesPerTeam)
      ? config.season.gamesPerTeam
      : null;
  const inningsPerGame = finiteNumber(config?.seasonLength?.inningsPerGame)
    ? config.seasonLength.inningsPerGame
    : finiteNumber(config?.rulesSnapshot?.inningsPerGame)
      ? config.rulesSnapshot.inningsPerGame
      : finiteNumber(config?.season?.inningsPerGame)
        ? config.season.inningsPerGame
        : null;
  const seasonContext = buildSeasonContext(
    input,
    gamesPerTeam,
    inningsPerGame,
    scheduleRows.length,
    seasonMetadata?.totalGames ?? null,
  );

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const battingByPlayerId = mapByPlayerId(battingStats);
  const pitchingByPlayerId = mapByPlayerId(pitchingStats);
  const fieldingByPlayerId = mapByPlayerId(fieldingStats);

  const rows = players.map((player): FranchiseValueInputRow => {
    const assignment = findCurrentAssignment(player, config?.league ?? null);
    const currentTeamId = assignment?.teamId ?? null;
    const currentTeam = currentTeamId ? teamsById.get(currentTeamId) : undefined;
    const stadiumSnapshot = getStadiumSnapshot(config, currentTeamId);
    const stadiumId = currentTeam?.stadiumId ?? stadiumSnapshot?.stadiumId ?? null;
    const seedParkFactorsAvailable = teamHasSeedParkFactors(currentTeam, stadiumSnapshot);
    const batting = battingByPlayerId.get(player.id);
    const pitching = pitchingByPlayerId.get(player.id);
    const fielding = fieldingByPlayerId.get(player.id);
    const battingWar = hasBattingWarInput(batting);
    const pitchingWar = hasPitchingWarInput(pitching);
    const fieldingWar = hasFieldingWarInput(fielding, batting);
    const baserunningWar = hasBaserunningWarInput(batting);
    const warPreviewValues = buildWarPreviewValues(batting, pitching);
    const salaryBaselineAvailable = finiteNumber(player.salary) && Boolean(config?.salaryBaseline?.calculationVersion);
    const teamSalaryBaselineAvailable = hasTeamPayrollBaseline(config, currentTeamId);
    const playerWpaAvailable = completedGames.some((game) =>
      (game.playerWpaTotals ?? []).some((total) => total.playerId === player.id),
    );
    const managerWpaAvailable = currentTeamId
      ? completedGames.some((game) =>
          (game.managerWpaTotals ?? []).some((total) => total.teamId === currentTeamId),
        )
      : false;
    const archiveBackedWpaAvailable = playerWpaAvailable || managerWpaAvailable;
    const limitations: string[] = [
      'Final True Value and dynamic designations are not calculated by this read-only contract.',
      'WPA and Manager WPA are not promoted into final value/designation inputs for internal v1.',
      'Custom and blended park factors are unavailable in internal v1; value inputs are not park-adjusted.',
    ];

    if (!batting && !pitching && !fielding) {
      limitations.push('No franchise season stat rows are available for this player.');
    }
    if (!salaryBaselineAvailable) {
      limitations.push('Salary baseline proof is missing or incomplete for this player.');
    }
    if (currentTeamId && !teamSalaryBaselineAvailable) {
      limitations.push('Team payroll baseline is missing for this player/team.');
    }
    if (!currentTeamId) {
      limitations.push('Current franchise team assignment is unavailable.');
    }
    if (!stadiumId) {
      limitations.push('Stadium identity is unavailable for this player/team.');
    }
    if (!seedParkFactorsAvailable) {
      limitations.push('Seed park factors are unavailable; park context is stored as unadjusted.');
    }
    if (gamesPerTeam === null || inningsPerGame === null) {
      limitations.push('Stored season length or innings metadata is missing.');
    }
    if (hasWarPreviewValue(warPreviewValues)) {
      limitations.push('WAR preview values are read-only scoped season-stat inputs and are not final True Value authority.');
    }

    return {
      contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId,
      seasonNumber: input.seasonNumber,
      playerId: player.id,
      playerName: playerName(player),
      currentTeamId,
      rosterStatus: assignment?.rosterStatus ?? null,
      salary: finiteNumber(player.salary) ? player.salary : null,
      contractYears: finiteNumber(player.contractYears) ? player.contractYears : null,
      salaryBaselineCalculationVersion: config?.salaryBaseline?.calculationVersion ?? null,
      teamSalaryBaseline: currentTeamId && finiteNumber(config?.salaryBaseline?.teamPayrolls?.[currentTeamId])
        ? config.salaryBaseline.teamPayrolls[currentTeamId]
        : null,
      salaryBaselineAvailable,
      seasonStatsAvailability: {
        batting: Boolean(batting),
        pitching: Boolean(pitching),
        fielding: Boolean(fielding),
        any: Boolean(batting || pitching || fielding),
      },
      warInputAvailability: {
        battingWar,
        pitchingWar,
        fieldingWar,
        baserunningWar,
        any: battingWar || pitchingWar || fieldingWar || baserunningWar,
        trustedForFinalValue: false,
      },
      warPreviewValues,
      wpaInputAvailability: {
        playerWpa: playerWpaAvailable,
        managerWpa: managerWpaAvailable,
        archiveBacked: archiveBackedWpaAvailable,
        trustedForFinalValue: false,
      },
      seasonContext,
      stadiumId,
      parkFactorAvailability: {
        stadiumIdAvailable: Boolean(stadiumId),
        seedParkFactorsAvailable,
        customParkFactorsAvailable: false,
        status: seedParkFactorsAvailable ? 'seed-only' : stadiumId ? 'custom-unavailable' : 'unadjusted',
        parkAdjustedValueInputsAvailable: false,
      },
      limitations: unique(limitations),
    };
  });

  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId,
    seasonNumber: input.seasonNumber,
    generatedAt: Date.now(),
    seasonContext,
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: unique(rows.flatMap((row) => row.limitations)),
  };
}
