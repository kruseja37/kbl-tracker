import type { FranchiseSalaryBaselineProof, StoredFranchiseConfig } from '../types/franchise';
import type { Player, Team } from './leagueBuilderStorage';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  getFranchisePlayer,
  saveFranchisePlayer,
} from './franchisePlayerStorage';
import {
  getFranchiseConfig,
  saveFranchiseConfig,
} from './franchiseManager';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
  calculateFranchiseCurrentSalary,
  getVisibleSafeFranchisePlayerSalary,
} from './franchiseSalary';

export const FRANCHISE_SALARY_SYSTEM_POLICY_VERSION = 'franchise-salary-system-v1-current-season';

export interface FranchiseSalarySystemPolicies {
  salaryValuesPersisted: boolean;
  teamPayrollPersisted: boolean;
  fameModifierActive: false;
  trueValueCalculated: false;
  designationFinalizationAllowed: false;
  luxuryTaxActive: false;
  salaryMatchingActive: false;
  aiTradeSalaryValuationActive: false;
  moraleMutationAllowed: false;
  relationshipEffectsAllowed: false;
  mode3HandoffAllowed: false;
}

export interface FranchiseSalarySystemUpsertResult {
  policyVersion: typeof FRANCHISE_SALARY_SYSTEM_POLICY_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  persisted: boolean;
  updatedPlayerCount: number;
  skippedPlayerCount: number;
  salaryBaseline: FranchiseSalaryBaselineProof | null;
  policies: FranchiseSalarySystemPolicies;
  blockers: string[];
  limitations: string[];
}

function policies(persisted: boolean): FranchiseSalarySystemPolicies {
  return {
    salaryValuesPersisted: persisted,
    teamPayrollPersisted: persisted,
    fameModifierActive: false,
    trueValueCalculated: false,
    designationFinalizationAllowed: false,
    luxuryTaxActive: false,
    salaryMatchingActive: false,
    aiTradeSalaryValuationActive: false,
    moraleMutationAllowed: false,
    relationshipEffectsAllowed: false,
    mode3HandoffAllowed: false,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasScope(report: FranchiseValueInputReport): boolean {
  return Boolean(
    report.franchiseId.trim() &&
    report.seasonId.trim() &&
    report.statsScopeId.trim() &&
    Number.isInteger(report.seasonNumber) &&
    report.seasonNumber > 0,
  );
}

function rowMatchesReport(report: FranchiseValueInputReport, row: FranchiseValueInputRow): boolean {
  return (
    row.franchiseId === report.franchiseId &&
    row.seasonId === report.seasonId &&
    row.statsScopeId === report.statsScopeId &&
    row.seasonNumber === report.seasonNumber &&
    Boolean(row.playerId.trim())
  );
}

function positiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function rowPersistenceBlockers(report: FranchiseValueInputReport, row: FranchiseValueInputRow): string[] {
  const blockers: string[] = [];
  if (!rowMatchesReport(report, row)) {
    blockers.push(`Salary row ${row.playerId || '(blank player id)'} scope does not match the report scope or has a blank player id.`);
  }
  if (!positiveFiniteNumber(row.seasonContext.gamesPerTeam)) {
    blockers.push(`Salary row ${row.playerId || '(blank player id)'} is missing explicit games-per-team season metadata.`);
  }
  if (!positiveFiniteNumber(row.seasonContext.inningsPerGame)) {
    blockers.push(`Salary row ${row.playerId || '(blank player id)'} is missing explicit innings-per-game season metadata.`);
  }
  return blockers;
}

function assignedTeamId(player: Player, leagueId: string | null | undefined): string | null {
  const assignments = player.leagueAssignments ?? [];
  const assignment = assignments.find((candidate) =>
    candidate.leagueId === leagueId &&
    candidate.teamId &&
    (candidate.rosterStatus === 'MLB' || candidate.rosterStatus === 'FARM'),
  ) ?? assignments.find((candidate) =>
    candidate.teamId &&
    (candidate.rosterStatus === 'MLB' || candidate.rosterStatus === 'FARM'),
  );
  return assignment?.teamId ?? null;
}

export function buildFranchiseSalaryBaselineProofFromPlayers(
  leagueId: string | null | undefined,
  teams: Team[],
  players: Player[],
): FranchiseSalaryBaselineProof {
  const teamIds = new Set(teams.map((team) => team.id));
  const teamPayrolls: Record<string, number> = {};
  for (const team of teams) teamPayrolls[team.id] = 0;

  for (const player of players) {
    const teamId = assignedTeamId(player, leagueId);
    if (!teamId || !teamIds.has(teamId)) continue;
    teamPayrolls[teamId] += getVisibleSafeFranchisePlayerSalary(player) ?? 0;
  }

  const totalSalary = Object.values(teamPayrolls).reduce((sum, salary) => sum + salary, 0);
  const salariedPlayerCount = players.filter((player) =>
    (getVisibleSafeFranchisePlayerSalary(player) ?? 0) > 0,
  ).length;

  return {
    calculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
    playerCount: players.length,
    salariedPlayerCount,
    totalSalary,
    teamPayrolls,
  };
}

function salaryFactorMetadata(
  calculation: ReturnType<typeof calculateFranchiseCurrentSalary>,
  row: FranchiseValueInputRow,
): Player['salaryFactors'] {
  if (calculation.source === 'hidden-farm-public-context') {
    return {
      source: 'hidden-farm-public-context',
      gamesPerSeason: calculation.adaptiveStandards.gamesPerSeason,
      inningsPerGame: calculation.adaptiveStandards.inningsPerGame,
    };
  }

  return {
    source: 'multifactor-current-season',
    baseSalary: calculation.breakdown?.baseSalary,
    positionMultiplier: calculation.breakdown?.positionMultiplier,
    traitModifier: calculation.breakdown?.traitModifier,
    ageFactor: calculation.breakdown?.ageFactor,
    performanceModifier: calculation.breakdown?.performanceModifier,
    fameModifier: calculation.breakdown?.fameModifier,
    personalityModifier: calculation.breakdown?.personalityModifier,
    actualWar: row.warPreviewValues.totalWar,
    expectedWar: calculation.expectedPerformance?.total ?? null,
    gamesPerSeason: calculation.adaptiveStandards.gamesPerSeason,
    inningsPerGame: calculation.adaptiveStandards.inningsPerGame,
  };
}

function playerNeedsSalaryUpdate(player: Player, next: Player): boolean {
  return (
    player.salary !== next.salary ||
    player.salaryCalculationVersion !== next.salaryCalculationVersion ||
    player.salarySeasonId !== next.salarySeasonId ||
    player.salaryStatsScopeId !== next.salaryStatsScopeId ||
    player.salarySeasonNumber !== next.salarySeasonNumber ||
    JSON.stringify(player.salaryFactors ?? null) !== JSON.stringify(next.salaryFactors ?? null)
  );
}

function baselineChanged(
  config: StoredFranchiseConfig,
  baseline: FranchiseSalaryBaselineProof,
): boolean {
  return JSON.stringify(config.salaryBaseline ?? null) !== JSON.stringify(baseline);
}

export async function upsertFranchiseSeasonSalariesFromValueInputReport(
  report: FranchiseValueInputReport,
): Promise<FranchiseSalarySystemUpsertResult> {
  const blockers: string[] = [];
  if (!hasScope(report)) {
    blockers.push('Explicit non-empty franchise, season, stats scope, and positive season number are required for salary persistence.');
  }
  if (blockers.length > 0) {
    return {
      policyVersion: FRANCHISE_SALARY_SYSTEM_POLICY_VERSION,
      franchiseId: report.franchiseId,
      seasonId: report.seasonId,
      statsScopeId: report.statsScopeId,
      seasonNumber: report.seasonNumber,
      persisted: false,
      updatedPlayerCount: 0,
      skippedPlayerCount: report.rows.length,
      salaryBaseline: null,
      policies: policies(false),
      blockers,
      limitations: [
        'No salary writes occur when report scope identity is incomplete.',
      ],
    };
  }

  const [config, teams, players] = await Promise.all([
    getFranchiseConfig(report.franchiseId),
    getAllFranchiseTeams(report.franchiseId),
    getAllFranchisePlayers(report.franchiseId),
  ]);
  if (!config) {
    return {
      policyVersion: FRANCHISE_SALARY_SYSTEM_POLICY_VERSION,
      franchiseId: report.franchiseId,
      seasonId: report.seasonId,
      statsScopeId: report.statsScopeId,
      seasonNumber: report.seasonNumber,
      persisted: false,
      updatedPlayerCount: 0,
      skippedPlayerCount: report.rows.length,
      salaryBaseline: null,
      policies: policies(false),
      blockers: ['Franchise config is required before salary values can be persisted.'],
      limitations: [
        'No salary writes occur without the franchise handoff/config record.',
      ],
    };
  }

  const rowsByPlayerId = new Map(report.rows.map((row) => [row.playerId, row]));
  const nextPlayersById = new Map(players.map((player) => [player.id, player]));
  let updatedPlayerCount = 0;
  let skippedPlayerCount = 0;
  const limitations: string[] = [
    'Fame modifier is reserved and neutral at 1.0 for Franchise v1.',
    'Salary matching, luxury tax, AI trade valuation, True Value, designations, morale, relationships, offseason, and Mode 3 remain inactive.',
  ];
  let processedSalaryRowCount = 0;

  for (const player of players) {
    const row = rowsByPlayerId.get(player.id);
    if (!row) {
      skippedPlayerCount += 1;
      continue;
    }
    const rowBlockers = rowPersistenceBlockers(report, row);
    if (rowBlockers.length > 0) {
      skippedPlayerCount += 1;
      blockers.push(...rowBlockers);
      continue;
    }

    const current = await getFranchisePlayer(report.franchiseId, player.id);
    if (!current) {
      skippedPlayerCount += 1;
      continue;
    }
    processedSalaryRowCount += 1;

    const calculation = calculateFranchiseCurrentSalary(current, {
      seasonStats: row.warPreviewValues,
      seasonContext: {
        gamesPerTeam: row.seasonContext.gamesPerTeam,
        inningsPerGame: row.seasonContext.inningsPerGame,
      },
    });

    if (calculation.salary === null) {
      skippedPlayerCount += 1;
      limitations.push(...calculation.limitations);
      continue;
    }

    const nextPlayer: Player = {
      ...current,
      salary: calculation.salary,
      salaryCalculationVersion: calculation.calculationVersion,
      salarySeasonId: report.seasonId,
      salaryStatsScopeId: report.statsScopeId,
      salarySeasonNumber: report.seasonNumber,
      salaryUpdatedAt: new Date().toISOString(),
      salaryFactors: salaryFactorMetadata(calculation, row),
    };

    if (playerNeedsSalaryUpdate(current, nextPlayer)) {
      const saved = await saveFranchisePlayer(report.franchiseId, nextPlayer);
      nextPlayersById.set(saved.id, saved);
      updatedPlayerCount += 1;
    } else {
      nextPlayersById.set(current.id, current);
    }
    limitations.push(...calculation.limitations);
  }

  if (processedSalaryRowCount === 0) {
    return {
      policyVersion: FRANCHISE_SALARY_SYSTEM_POLICY_VERSION,
      franchiseId: report.franchiseId,
      seasonId: report.seasonId,
      statsScopeId: report.statsScopeId,
      seasonNumber: report.seasonNumber,
      persisted: false,
      updatedPlayerCount,
      skippedPlayerCount,
      salaryBaseline: null,
      policies: policies(false),
      blockers: unique(blockers.length > 0
        ? blockers
        : ['No storable salary rows were available for the scoped salary sync.']),
      limitations: unique([
        ...limitations,
        'No current salary or payroll writes occur unless at least one row has explicit season length and innings metadata.',
      ]),
    };
  }

  const nextPlayers = Array.from(nextPlayersById.values());
  const salaryBaseline = buildFranchiseSalaryBaselineProofFromPlayers(config.league, teams, nextPlayers);
  let configPersisted = false;
  if (baselineChanged(config, salaryBaseline)) {
    const nextConfig: StoredFranchiseConfig = {
      ...config,
      salaryBaseline,
      handoffContract: {
        ...config.handoffContract,
        salaryBaseline,
      },
    };
    await saveFranchiseConfig(nextConfig);
    configPersisted = true;
  }

  const persisted = updatedPlayerCount > 0 || configPersisted;

  return {
    policyVersion: FRANCHISE_SALARY_SYSTEM_POLICY_VERSION,
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    persisted,
    updatedPlayerCount,
    skippedPlayerCount,
    salaryBaseline,
    policies: policies(persisted),
    blockers: unique(blockers),
    limitations: unique(limitations),
  };
}
