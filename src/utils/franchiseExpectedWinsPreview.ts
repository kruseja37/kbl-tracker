import type {
  FranchiseTrueValuePreviewReport,
  FranchiseTrueValuePreviewTeamSummary,
} from './franchiseTrueValuePreview';

export const FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION =
  'franchise-expected-wins-preview-v1-readonly';

export type FranchiseExpectedWinsPreviewStatus = 'preview-only' | 'blocked';

export interface FranchiseExpectedWinsPreviewTeamRow {
  contractVersion: typeof FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  previewPlayerCount: number;
  blockedPlayerCount: number;
  teamPreviewValueTotal: number | null;
  leagueAveragePreviewValueBaseline: number | null;
  previewGapFromLeagueAverage: number | null;
  expectedWinsEstimate: number | null;
  expectedWinsTrusted: false;
  fanMoraleMutationAllowed: false;
  dailySnapshotPersistenceAllowed: false;
  designationFinalizationAllowed: false;
  salaryMovementAllowed: false;
  relationshipEffectsAllowed: false;
  mode3HandoffAllowed: false;
  status: FranchiseExpectedWinsPreviewStatus;
  blockers: string[];
  limitations: string[];
}

export interface FranchiseExpectedWinsPreviewReport {
  contractVersion: typeof FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  sourceContractVersion: string;
  gamesPerTeam: number | null;
  leagueAveragePreviewValueBaseline: number | null;
  teamRows: FranchiseExpectedWinsPreviewTeamRow[];
  policies: {
    expectedWinsTrusted: false;
    expectedWinsPersisted: false;
    fanMoraleMutationAllowed: false;
    gameTrackerMutationAllowed: false;
    dailySnapshotPersistenceAllowed: false;
    designationFinalizationAllowed: false;
    salaryMovementAllowed: false;
    relationshipEffectsAllowed: false;
    mode3HandoffAllowed: false;
  };
  limitations: string[];
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasReportScope(report: FranchiseTrueValuePreviewReport): boolean {
  return Boolean(
    report.franchiseId &&
    report.seasonId &&
    report.statsScopeId &&
    Number.isInteger(report.seasonNumber) &&
    report.seasonNumber > 0,
  );
}

function eligibleTeamSummary(summary: FranchiseTrueValuePreviewTeamSummary): boolean {
  return summary.status === 'preview-only' &&
    summary.previewPlayerCount > 0 &&
    finiteNumber(summary.previewValueEstimateTotal) &&
    summary.previewValueEstimateTotal > 0;
}

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

function expectedWinsFromGap(gamesPerTeam: number, previewGap: number): number {
  const raw = (gamesPerTeam / 2) + (previewGap * 0.5);
  return rounded(Math.max(0, Math.min(gamesPerTeam, raw)));
}

function rowBlockers(
  report: FranchiseTrueValuePreviewReport,
  summary: FranchiseTrueValuePreviewTeamSummary,
  eligibleTeamCount: number,
  gamesPerTeam: number | null,
): string[] {
  const blockers: string[] = [];
  if (!hasReportScope(report)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required for expected-wins preview.');
  }
  if (!finiteNumber(gamesPerTeam) || gamesPerTeam <= 0) {
    blockers.push('Stored games-per-team season metadata is required for expected-wins preview.');
  }
  if (eligibleTeamCount < 2) {
    blockers.push('At least two teams with preview-only True Value team summaries are required for league-average expected-wins preview.');
  }
  if (!eligibleTeamSummary(summary)) {
    blockers.push('Team summary must have preview-only player value data before expected-wins preview can be estimated.');
  }
  return unique(blockers);
}

export function buildFranchiseExpectedWinsPreviewReport(
  trueValuePreviewReport: FranchiseTrueValuePreviewReport,
): FranchiseExpectedWinsPreviewReport {
  const gamesPerTeam = finiteNumber(trueValuePreviewReport.seasonContext?.gamesPerTeam)
    ? trueValuePreviewReport.seasonContext.gamesPerTeam
    : null;
  const eligibleSummaries = trueValuePreviewReport.teamSummaries.filter(eligibleTeamSummary);
  const leagueAveragePreviewValueBaseline = eligibleSummaries.length >= 2
    ? rounded(eligibleSummaries.reduce((total, summary) => total + summary.previewValueEstimateTotal, 0) / eligibleSummaries.length)
    : null;
  const eligibleTeamCount = eligibleSummaries.length;

  const teamRows = trueValuePreviewReport.teamSummaries.map((summary): FranchiseExpectedWinsPreviewTeamRow => {
    const blockers = rowBlockers(trueValuePreviewReport, summary, eligibleTeamCount, gamesPerTeam);
    const teamPreviewValueTotal = finiteNumber(summary.previewValueEstimateTotal)
      ? rounded(summary.previewValueEstimateTotal)
      : null;
    const previewGapFromLeagueAverage = blockers.length === 0 &&
      teamPreviewValueTotal !== null &&
      leagueAveragePreviewValueBaseline !== null
      ? rounded(teamPreviewValueTotal - leagueAveragePreviewValueBaseline)
      : null;
    const expectedWinsEstimate = blockers.length === 0 &&
      previewGapFromLeagueAverage !== null &&
      gamesPerTeam !== null
      ? expectedWinsFromGap(gamesPerTeam, previewGapFromLeagueAverage)
      : null;

    return {
      contractVersion: FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
      franchiseId: trueValuePreviewReport.franchiseId,
      seasonId: trueValuePreviewReport.seasonId,
      statsScopeId: trueValuePreviewReport.statsScopeId,
      seasonNumber: trueValuePreviewReport.seasonNumber,
      teamId: summary.teamId,
      previewPlayerCount: summary.previewPlayerCount,
      blockedPlayerCount: summary.blockedPlayerCount,
      teamPreviewValueTotal,
      leagueAveragePreviewValueBaseline,
      previewGapFromLeagueAverage,
      expectedWinsEstimate,
      expectedWinsTrusted: false,
      fanMoraleMutationAllowed: false,
      dailySnapshotPersistenceAllowed: false,
      designationFinalizationAllowed: false,
      salaryMovementAllowed: false,
      relationshipEffectsAllowed: false,
      mode3HandoffAllowed: false,
      status: blockers.length === 0 ? 'preview-only' : 'blocked',
      blockers,
      limitations: unique([
        ...summary.limitations,
        'Expected wins are preview-only because True Value totals are preview-only and upstream WAR completeness is not final.',
        'Preview expected wins are not trusted for fan morale mutation, expected-wins baselines, designations, salary movement, relationships, daily snapshots, or Mode 3.',
      ]),
    };
  });

  return {
    contractVersion: FRANCHISE_EXPECTED_WINS_PREVIEW_CONTRACT_VERSION,
    generatedAt: trueValuePreviewReport.generatedAt,
    franchiseId: trueValuePreviewReport.franchiseId,
    seasonId: trueValuePreviewReport.seasonId,
    statsScopeId: trueValuePreviewReport.statsScopeId,
    seasonNumber: trueValuePreviewReport.seasonNumber,
    sourceContractVersion: trueValuePreviewReport.contractVersion,
    gamesPerTeam,
    leagueAveragePreviewValueBaseline,
    teamRows,
    policies: {
      expectedWinsTrusted: false,
      expectedWinsPersisted: false,
      fanMoraleMutationAllowed: false,
      gameTrackerMutationAllowed: false,
      dailySnapshotPersistenceAllowed: false,
      designationFinalizationAllowed: false,
      salaryMovementAllowed: false,
      relationshipEffectsAllowed: false,
      mode3HandoffAllowed: false,
    },
    limitations: unique([
      ...trueValuePreviewReport.limitations,
      'Expected-wins preview is read-only and derived from position-relative True Value preview team summaries.',
      'Each preview value point above or below league average maps to approximately 0.5 wins for inspection only.',
      'No fan morale, salary, designation, relationship, daily snapshot, GameTracker completion, offseason, or Mode 3 state is persisted or mutated.',
    ]),
  };
}
