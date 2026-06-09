import {
  buildFranchiseValueInputRows,
  type BuildFranchiseValueInputRowsInput,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  upsertFranchiseSeasonSalariesFromValueInputReport,
  type FranchiseSalarySystemUpsertResult,
} from './franchiseSalarySystem';

export const FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION = 'franchise-salary-lifecycle-v1-current-salary';

export type FranchiseSalaryLifecycleStatus =
  | 'active'
  | 'stable-baseline'
  | 'preview-only'
  | 'blocked'
  | 'deferred';

export interface FranchiseSalaryLifecycleStep {
  status: FranchiseSalaryLifecycleStatus;
  persistable: boolean;
  recalculable: boolean;
  reasons: string[];
}

export interface FranchisePlayerSalaryLifecycleRecord {
  contractVersion: typeof FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  rosterStatus: string | null;
  salary: number | null;
  contractYears: number | null;
  salaryBaselineCalculationVersion: string | null;
  teamPayrollBaseline: number | null;
  initialSalaryBaseline: FranchiseSalaryLifecycleStep;
  teamPayrollBaselineState: FranchiseSalaryLifecycleStep;
  currentSalaryCalculation: FranchiseSalaryLifecycleStep;
  performanceSalaryMovement: FranchiseSalaryLifecycleStep;
  offseasonSalaryRecalculation: FranchiseSalaryLifecycleStep;
  persistable: boolean;
  recalculable: boolean;
  sourceInputs: {
    salaryBaselineAvailable: boolean;
    teamPayrollBaselineAvailable: boolean;
    seasonStatsAvailable: boolean;
    warPreviewInputAvailable: boolean;
    wpaAvailable: boolean;
    trustedFinalWarWpaAvailable: false;
    trueValueAvailable: false;
    parkAdjustedValueInputsAvailable: boolean;
    luxuryTaxActive: false;
    salaryMatchingActive: false;
    aiTradeValuationActive: false;
  };
  limitations: string[];
}

export interface FranchiseTeamSalaryLifecycleRecord {
  contractVersion: typeof FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  payrollBaseline: number | null;
  playerCount: number;
  payrollBaselineState: FranchiseSalaryLifecycleStep;
  limitations: string[];
}

export interface FranchiseSalaryLifecyclePolicyState {
  status: 'blocked';
  active: false;
  reasons: string[];
}

export interface FranchiseSalaryLifecycleReport {
  contractVersion: typeof FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  valueInputContractVersion: string;
  generatedAt: number;
  playerRecords: FranchisePlayerSalaryLifecycleRecord[];
  teamRecords: FranchiseTeamSalaryLifecycleRecord[];
  policies: {
    luxuryTax: FranchiseSalaryLifecyclePolicyState;
    salaryMatching: FranchiseSalaryLifecyclePolicyState;
    aiTradeSalaryValuation: FranchiseSalaryLifecyclePolicyState;
  };
  salarySystemSync: FranchiseSalarySystemUpsertResult | null;
  anyPersistable: boolean;
  anyRecalculable: boolean;
  limitations: string[];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function step(
  status: FranchiseSalaryLifecycleStatus,
  reasons: string[],
  persistable = false,
  recalculable = false,
): FranchiseSalaryLifecycleStep {
  return {
    status,
    persistable,
    recalculable,
    reasons: unique(reasons),
  };
}

function hasSeasonMetadata(row: FranchiseValueInputRow): boolean {
  return row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
}

function initialSalaryBaseline(row: FranchiseValueInputRow): FranchiseSalaryLifecycleStep {
  if (row.salary !== null && row.salaryBaselineAvailable) {
    return step('stable-baseline', [
      'Stored franchise salary is available from the Mode 1 handoff or current salary sync.',
      'Current salary values are part of the Franchise v1 salary system; non-salary consumers remain blocked.',
    ], true, true);
  }

  return step('blocked', [
    'Stored player salary baseline is missing or incomplete.',
    'Initial salary cannot be treated as stable until franchise-owned salary data and baseline proof exist.',
  ]);
}

function teamPayrollBaselineState(row: FranchiseValueInputRow): FranchiseSalaryLifecycleStep {
  if (row.currentTeamId && row.teamSalaryBaseline !== null) {
    return step('stable-baseline', [
      'Stored team payroll proof is available from the franchise salary baseline.',
      'Team payroll is recalculated from franchise-owned player salaries when the salary sync runs.',
    ], true, true);
  }

  return step('blocked', [
    'Team payroll baseline is missing for this player/team context.',
    'Team salary context cannot be treated as stable until handoff payroll proof exists.',
  ]);
}

function currentSalaryCalculation(row: FranchiseValueInputRow): FranchiseSalaryLifecycleStep {
  if (row.salary !== null && row.salaryBaselineAvailable && hasSeasonMetadata(row)) {
    if (row.rosterStatus === 'FARM') {
      return step('stable-baseline', [
        'FARM salary context is stable from public draft/scouting-safe salary or revealed known salary.',
        'Hidden FARM true ratings and true grade are not salary inputs.',
      ], true, true);
    }
    return step('active', [
      'Current salary calculation uses base ratings, position, age, traits, personality context, neutral fame, and scoped season-stat performance when available.',
      'This salary calculation does not create final True Value, designations, morale, relationships, salary matching, luxury tax, offseason, or Mode 3 state.',
    ], true, true);
  }

  const reasons = [
    'Current salary calculation is blocked until stored salary and season metadata are available.',
  ];
  if (row.salary === null || !row.salaryBaselineAvailable) {
    reasons.push('Stored franchise salary is missing or incomplete.');
  }
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are missing.');
  }
  return step('blocked', reasons);
}

function performanceSalaryMovement(row: FranchiseValueInputRow): FranchiseSalaryLifecycleStep {
  if (row.salary !== null && row.salaryBaselineAvailable && hasSeasonMetadata(row)) {
    if (row.seasonStatsAvailability.any && row.warPreviewValues.totalWar !== null) {
      return step('active', [
        'Performance salary modifier is active from scoped current-season WAR-like stat inputs.',
        'These salary inputs do not promote WAR/WPA into final True Value, designations, morale, awards, or relationship authority.',
      ], true, true);
    }
    return step('stable-baseline', [
      'Performance salary modifier is neutral at 1.0 until scoped season stat inputs exist.',
      'Current salary can still persist from ratings, position, age, traits, personality context, and neutral fame.',
    ], true, true);
  }

  const reasons = [
    'Performance salary calculation is blocked until current franchise salary and season metadata are available.',
    'True Value, designations, morale, relationships, salary matching, luxury tax, offseason, and Mode 3 remain blocked.',
  ];
  if (!row.seasonStatsAvailability.any) {
    reasons.push('No franchise season stat rows are available for this player.');
  }
  if (!row.warInputAvailability.any) {
    reasons.push('WAR-like preview inputs are unavailable for this player.');
  }
  if (!row.wpaInputAvailability.archiveBacked) {
    reasons.push('Archive-backed WPA inputs are unavailable for this player/team.');
  }
  return step('blocked', reasons);
}

function offseasonSalaryRecalculation(row: FranchiseValueInputRow): FranchiseSalaryLifecycleStep {
  const reasons = [
    'Offseason salary recalculation is deferred for internal v1.',
    'Trusted True Value, final WAR/WPA, contract-year, arbitration/free-agency, and Mode 3 lifecycle inputs are not canonical yet.',
  ];
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are missing.');
  }
  return step('deferred', reasons);
}

function rosterLimitations(row: FranchiseValueInputRow): string[] {
  if (row.rosterStatus === 'FARM') {
    return ['FARM player salary context uses public draft/scouting-safe salary or revealed known salary; hidden true ratings remain blocked.'];
  }
  if (!row.currentTeamId || !row.rosterStatus) {
    return ['Free-agent or unassigned salary context is incomplete for franchise team payroll decisions.'];
  }
  if (row.rosterStatus !== 'MLB') {
    return [`Roster status ${row.rosterStatus} is outside active MLB salary lifecycle handling for internal v1.`];
  }
  return [];
}

function sourceInputs(row: FranchiseValueInputRow): FranchisePlayerSalaryLifecycleRecord['sourceInputs'] {
  return {
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    teamPayrollBaselineAvailable: row.teamSalaryBaseline !== null,
    seasonStatsAvailable: row.seasonStatsAvailability.any,
    warPreviewInputAvailable: row.warInputAvailability.any,
    wpaAvailable: row.wpaInputAvailability.archiveBacked,
    trustedFinalWarWpaAvailable: false,
    trueValueAvailable: false,
    parkAdjustedValueInputsAvailable: row.parkFactorAvailability.parkAdjustedValueInputsAvailable,
    luxuryTaxActive: false,
    salaryMatchingActive: false,
    aiTradeValuationActive: false,
  };
}

function playerRecord(row: FranchiseValueInputRow): FranchisePlayerSalaryLifecycleRecord {
  const currentSalary = currentSalaryCalculation(row);
  const performanceSalary = performanceSalaryMovement(row);
  const limitations = unique([
    ...row.limitations,
    ...rosterLimitations(row),
    'Final True Value salary movement is unavailable in internal v1.',
    'Luxury tax, salary matching, and AI trade salary valuation are inactive in internal v1.',
  ]);

  return {
    contractVersion: FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    salary: row.salary,
    contractYears: row.contractYears,
    salaryBaselineCalculationVersion: row.salaryBaselineCalculationVersion,
    teamPayrollBaseline: row.teamSalaryBaseline,
    initialSalaryBaseline: initialSalaryBaseline(row),
    teamPayrollBaselineState: teamPayrollBaselineState(row),
    currentSalaryCalculation: currentSalary,
    performanceSalaryMovement: performanceSalary,
    offseasonSalaryRecalculation: offseasonSalaryRecalculation(row),
    persistable: currentSalary.persistable,
    recalculable: currentSalary.recalculable || performanceSalary.recalculable,
    sourceInputs: sourceInputs(row),
    limitations,
  };
}

function teamRecordsFromRows(
  valueInputReport: FranchiseValueInputReport,
): FranchiseTeamSalaryLifecycleRecord[] {
  const teamIds = unique(
    valueInputReport.rows
      .map((row) => row.currentTeamId)
      .filter((teamId): teamId is string => Boolean(teamId)),
  ).sort();

  return teamIds.map((teamId) => {
    const teamRows = valueInputReport.rows.filter((row) => row.currentTeamId === teamId);
    const payroll = teamRows.find((row) => row.teamSalaryBaseline !== null)?.teamSalaryBaseline ?? null;
    const payrollBaselineState = payroll !== null
      ? step('stable-baseline', [
          'Stored team payroll proof is available from current franchise salary data.',
          'Team payroll is recalculated from copied MLB and FARM franchise-owned players.',
        ], true, true)
      : step('blocked', [
          'Team payroll baseline is missing for this team.',
          'Team payroll cannot drive salary lifecycle decisions until baseline proof exists.',
        ]);

    return {
      contractVersion: FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION,
      franchiseId: valueInputReport.franchiseId,
      seasonId: valueInputReport.seasonId,
      statsScopeId: valueInputReport.statsScopeId,
      seasonNumber: valueInputReport.seasonNumber,
      teamId,
      payrollBaseline: payroll,
      playerCount: teamRows.length,
      payrollBaselineState,
      limitations: unique([
        ...teamRows.flatMap((row) => row.limitations),
        ...(payroll === null ? ['Team payroll baseline is unavailable for this team.'] : []),
      ]),
    };
  });
}

function blockedPolicy(reasons: string[]): FranchiseSalaryLifecyclePolicyState {
  return {
    status: 'blocked',
    active: false,
    reasons: unique(reasons),
  };
}

export function classifyFranchiseSalaryLifecycle(
  valueInputReport: FranchiseValueInputReport,
  salarySystemSync: FranchiseSalarySystemUpsertResult | null = null,
): FranchiseSalaryLifecycleReport {
  const playerRecords = valueInputReport.rows.map(playerRecord);
  const teamRecords = teamRecordsFromRows(valueInputReport);
  const policies = {
    luxuryTax: blockedPolicy([
      'Luxury tax is inactive for Franchise internal v1.',
      'No cap/tax thresholds or enforcement paths are canonical.',
    ]),
    salaryMatching: blockedPolicy([
      'Salary matching for trades is inactive for Franchise internal v1.',
      'Trades must not be blocked or valued by salary matching in this slice.',
    ]),
    aiTradeSalaryValuation: blockedPolicy([
      'AI trade salary valuation is inactive for Franchise internal v1.',
      'AI trade behavior and salary-based valuation are not part of the current v1 scope.',
    ]),
  };

  return {
    contractVersion: FRANCHISE_SALARY_LIFECYCLE_CONTRACT_VERSION,
    franchiseId: valueInputReport.franchiseId,
    seasonId: valueInputReport.seasonId,
    statsScopeId: valueInputReport.statsScopeId,
    seasonNumber: valueInputReport.seasonNumber,
    valueInputContractVersion: valueInputReport.contractVersion,
    generatedAt: Date.now(),
    playerRecords,
    teamRecords,
    policies,
    salarySystemSync,
    anyPersistable: playerRecords.some((record) => record.persistable),
    anyRecalculable: playerRecords.some((record) => record.recalculable),
    limitations: unique([
      ...valueInputReport.limitations,
      ...playerRecords.flatMap((record) => record.limitations),
      ...teamRecords.flatMap((record) => record.limitations),
      ...(salarySystemSync?.limitations ?? []),
      'Current salary values and team payroll proof can persist in Franchise v1.',
      'True Value, designation finalization, luxury tax, salary matching, AI trade salary valuation, morale, relationships, offseason, and Mode 3 remain blocked.',
    ]),
  };
}

export interface BuildFranchiseSalaryLifecycleOptions {
  syncCurrentSalaries?: boolean;
}

export async function buildFranchiseSalaryLifecycle(
  input: BuildFranchiseValueInputRowsInput,
  options: BuildFranchiseSalaryLifecycleOptions = {},
): Promise<FranchiseSalaryLifecycleReport> {
  let valueInputReport = await buildFranchiseValueInputRows(input);
  let salarySystemSync: FranchiseSalarySystemUpsertResult | null = null;
  if (options.syncCurrentSalaries) {
    salarySystemSync = await upsertFranchiseSeasonSalariesFromValueInputReport(valueInputReport);
    valueInputReport = await buildFranchiseValueInputRows(input);
  }
  return classifyFranchiseSalaryLifecycle(valueInputReport, salarySystemSync);
}
