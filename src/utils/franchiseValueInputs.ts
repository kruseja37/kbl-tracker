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
import { getVisibleSafeFranchisePlayerSalary } from './franchiseSalary';
import {
  FRANCHISE_TRUE_VALUE_RESERVE_POOL,
  buildFranchiseEffectivePositionReport,
  type FranchiseTrueValuePositioning,
} from './franchiseEffectivePosition';
import {
  getTrustedValueArtifact,
  isPlayerTrustedForValue,
} from './franchiseTrustedValueStorage';

export const FRANCHISE_VALUE_INPUT_CONTRACT_VERSION = 'franchise-mode2-value-inputs-v1-readonly';

export type FranchiseValueParkFactorStatus = 'seed-only' | 'custom-unavailable' | 'unadjusted';

export interface FranchiseWarPreviewValues {
  battingWar: number | null;
  pitchingWar: number | null;
  fieldingWar: number | null;
  baserunningWar: number | null;
  totalWar: number | null;
  totalWarSource: 'stat-row' | 'derived-from-components' | 'unavailable';
  trustedForFinalValue: boolean;
}

export interface FranchiseWarConsumerTrust {
  teamMvpDesignations: boolean;
  aceDesignations: boolean;
  fanFavoriteAlbatrossDesignations: boolean;
  awards: boolean;
  salaryMovement: false;
  trueValue: boolean;
  morale: false;
  mode3Handoff: false;
  blockers: string[];
  limitations: string[];
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
  valuePosition: string | null;
  trueValuePositioning?: FranchiseTrueValuePositioning;
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
    trustedForFinalValue: boolean;
  };
  warPreviewValues: FranchiseWarPreviewValues;
  warConsumerTrust?: FranchiseWarConsumerTrust;
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
  trustedValueArtifactFrozen: boolean;
  rows: FranchiseValueInputRow[];
  trueValuePolicy: {
    finalTrueValueCalculated: boolean;
    persistedTrueValueCreated: boolean;
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
    // TV1 R-4/DISCOVERY 1: True Value consumes persisted season WAR rows
    // after WAR storage succeeds. The batting row total carries batting,
    // fielding, and baserunning WAR; pitching WAR is persisted separately.
    const totalWar = pitchingWar !== null
      ? Number((statRowTotalWar + pitchingWar).toFixed(3))
      : statRowTotalWar;
    return {
      battingWar,
      pitchingWar,
      fieldingWar,
      baserunningWar,
      totalWar,
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

function hasCompleteSeasonContext(context: FranchiseValueInputSeasonContext): boolean {
  return finiteNumber(context.gamesPerTeam) &&
    context.gamesPerTeam > 0 &&
    finiteNumber(context.inningsPerGame) &&
    context.inningsPerGame > 0 &&
    context.seasonLengthSource === 'stored-franchise-config';
}

function buildWarConsumerTrust(params: {
  currentTeamId: string | null;
  rosterStatus: string | null;
  seasonContext: FranchiseValueInputSeasonContext;
  seasonStatsAvailable: boolean;
  scopedCompletedArchiveAvailable: boolean;
  trustedValueArtifactFrozen: boolean;
  trustedForTrueValue: boolean;
  warInputAvailability: FranchiseValueInputRow['warInputAvailability'];
  warPreviewValues: FranchiseWarPreviewValues;
}): FranchiseWarConsumerTrust {
  const blockers: string[] = [];
  const limitations = [
    'WAR consumer trust is limited to TEAM_MVP/ACE designation input gating; Albatross and awards trust are read only from the D6 trusted-value artifact.',
  ];
  if (!params.currentTeamId) {
    blockers.push('Current MLB team id is required before WAR can be trusted for designation inputs.');
  }
  if (params.rosterStatus !== 'MLB') {
    blockers.push(`Current MLB roster status is required before WAR can be trusted; found ${params.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  if (!hasCompleteSeasonContext(params.seasonContext)) {
    blockers.push('Explicit stored games-per-team and innings-per-game metadata are required before WAR can be trusted for designation inputs.');
  }
  if (!params.seasonStatsAvailable) {
    blockers.push('Scoped franchise season stat rows are required before WAR can be trusted for designation inputs.');
  }
  if (!params.scopedCompletedArchiveAvailable) {
    blockers.push('Scoped completed GameTracker archive evidence is required before WAR can be trusted for designation inputs.');
  }

  const commonReady = blockers.length === 0;
  const teamMvpBlockers = [...blockers];
  if (!params.warInputAvailability.any || params.warPreviewValues.totalWar === null) {
    teamMvpBlockers.push('TEAM_MVP WAR trust requires a numeric total WAR value from scoped season stats.');
  }

  const aceBlockers = [...blockers];
  if (!params.warInputAvailability.pitchingWar || params.warPreviewValues.pitchingWar === null) {
    aceBlockers.push('ACE WAR trust requires a numeric pitching WAR value from scoped season stats.');
  }

  return {
    teamMvpDesignations: commonReady && teamMvpBlockers.length === 0,
    aceDesignations: commonReady && aceBlockers.length === 0,
    fanFavoriteAlbatrossDesignations: params.trustedForTrueValue,
    awards: params.trustedForTrueValue && params.trustedValueArtifactFrozen,
    salaryMovement: false,
    trueValue: params.trustedForTrueValue,
    morale: false,
    mode3Handoff: false,
    blockers: unique([...teamMvpBlockers, ...aceBlockers]),
    limitations,
  };
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

function buildEffectivePositionLimitations(
  positioning: FranchiseTrueValuePositioning | undefined,
): string[] {
  if (!positioning) return ['EP1 R-8/R-10 effective-position replay was unavailable for this row.'];
  const limitations = [
    'EP1 R-8/R-10: True Value valuePosition is derived from ordered completed-game starting-lineup replay.',
  ];
  if (positioning.poolPosition === FRANCHISE_TRUE_VALUE_RESERVE_POOL) {
    limitations.push('EP1 R-8/R-9: True Value uses the Reserve pool because starts-share is below 0.40 of completed team games.');
  }
  if (positioning.valuationMode === 'two-way-composite') {
    limitations.push('EP1 R-8 pt 5/6: Two-way trait holders use compositional arm/bat True Value instead of a single peer pool.');
  }
  limitations.push(...positioning.reasons);
  return limitations;
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
    trustedValueArtifact,
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
    getTrustedValueArtifact(input.franchiseId, input.seasonId, statsScopeId),
  ]);
  const trustedValueArtifactFrozen = trustedValueArtifact?.frozen === true;

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
  const assignmentsByPlayerId = new Map(players.map((player) => [
    player.id,
    findCurrentAssignment(player, config?.league ?? null),
  ]));
  const effectivePositionReport = await buildFranchiseEffectivePositionReport({
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId,
    players: players.map((player) => ({
      playerId: player.id,
      profilePosition: player.primaryPosition,
      currentTeamId: assignmentsByPlayerId.get(player.id)?.teamId ?? null,
      trait1: player.trait1 ?? null,
      trait2: player.trait2 ?? null,
      pitcherRole: player.primaryPosition,
    })),
  });

  const rows = players.map((player): FranchiseValueInputRow => {
    const assignment = assignmentsByPlayerId.get(player.id) ?? null;
    const trueValuePositioning = effectivePositionReport.playerPositions[player.id];
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
    const trustedForTrueValue = isPlayerTrustedForValue(trustedValueArtifact, player.id);
    const warPreviewValues = {
      ...buildWarPreviewValues(batting, pitching),
      trustedForFinalValue: trustedForTrueValue,
    };
    const warInputAvailability: FranchiseValueInputRow['warInputAvailability'] = {
      battingWar,
      pitchingWar,
      fieldingWar,
      baserunningWar,
      any: battingWar || pitchingWar || fieldingWar || baserunningWar,
      trustedForFinalValue: trustedForTrueValue,
    };
    const scopedCompletedArchiveAvailable = completedGames.some((game) =>
      game.franchiseId === input.franchiseId &&
      game.seasonId === input.seasonId &&
      game.statsScopeId === statsScopeId &&
      game.aggregationStatus !== 'incomplete',
    );
    const warConsumerTrust = buildWarConsumerTrust({
      currentTeamId,
      rosterStatus: assignment?.rosterStatus ?? null,
      seasonContext,
      seasonStatsAvailable: Boolean(batting || pitching || fielding),
      scopedCompletedArchiveAvailable,
      trustedValueArtifactFrozen,
      trustedForTrueValue,
      warInputAvailability,
      warPreviewValues,
    });
    const visibleSafeSalary = getVisibleSafeFranchisePlayerSalary(player);
    const salaryBaselineAvailable = visibleSafeSalary !== null && Boolean(config?.salaryBaseline?.calculationVersion);
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
    if (warConsumerTrust.awards) {
      limitations.push('D8 award trust is limited to frozen D6 trusted-value artifact membership; D9 owns award ranking, storage, recompute, and winners.');
    } else if (warConsumerTrust.teamMvpDesignations || warConsumerTrust.aceDesignations) {
      limitations.push('Scoped WAR is trusted only for TEAM_MVP/ACE designation input gating; final designations, value delta, awards, salary movement, morale, and Mode 3 remain blocked.');
    }
    if (assignment?.rosterStatus === 'FARM' && player.ratingRevealState !== 'revealed') {
      limitations.push('Hidden FARM prospect salary uses draft/scouting-safe public context; true ratings and true grade are not salary inputs.');
    }
    limitations.push(...buildEffectivePositionLimitations(trueValuePositioning));

    return {
      contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId,
      seasonNumber: input.seasonNumber,
      playerId: player.id,
      playerName: playerName(player),
      valuePosition: trueValuePositioning?.valuePosition ?? player.primaryPosition ?? null,
      trueValuePositioning,
      currentTeamId,
      rosterStatus: assignment?.rosterStatus ?? null,
      salary: visibleSafeSalary,
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
      warInputAvailability,
      warPreviewValues,
      warConsumerTrust,
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
    trustedValueArtifactFrozen,
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: Boolean(trustedValueArtifact && trustedValueArtifact.trustedPlayerIds.length > 0),
      persistedTrueValueCreated: Boolean(trustedValueArtifact && trustedValueArtifact.trustedPlayerIds.length > 0),
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: unique(rows.flatMap((row) => row.limitations)),
  };
}
