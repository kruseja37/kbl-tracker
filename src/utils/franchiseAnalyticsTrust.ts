import type { CompletedGameRecord } from './gameStorage';
import type {
  FranchisePlayerTeamStatStint,
} from './franchiseStatAttribution';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
  FranchiseValueParkFactorStatus,
} from './franchiseValueInputs';
import type { ScheduledGame } from './scheduleStorage';

export const FRANCHISE_ANALYTICS_TRUST_CONTRACT_VERSION = 'franchise-analytics-trust-v1-readonly';

export type FranchiseAnalyticsTrustStatus = 'trusted' | 'preview-only' | 'blocked' | 'not-applicable';

export interface FranchiseAnalyticsTrustArea {
  status: FranchiseAnalyticsTrustStatus;
  reasons: string[];
  limitations: string[];
}

export interface FranchiseScoreOnlyBoundaryTrust extends FranchiseAnalyticsTrustArea {
  scoreOnlyRows: number;
  trustedForScheduleAndStandings: boolean;
  trustedForPlayerStats: false;
  trustedForWpa: false;
  trustedForWar: false;
  trustedForAwards: false;
  trustedForDesignations: false;
  trustedForSalaryMovement: false;
  trustedForMorale: false;
  trustedForRelationships: false;
  trustedForNarrative: false;
}

export interface FranchiseWpaTrust extends FranchiseAnalyticsTrustArea {
  playerWpaArchiveBacked: boolean;
  managerWpaArchiveBacked: boolean;
  finalValueTrusted: false;
}

export interface FranchiseWarTrust extends FranchiseAnalyticsTrustArea {
  warLikePreviewAvailable: boolean;
  trustedForTeamMvpDesignations: boolean;
  trustedForAceDesignations: boolean;
  trustedForFanFavoriteAlbatrossDesignations: false;
  trustedForAwards: false;
  trustedForSalaryMovement: false;
  trustedForTrueValue: false;
  trustedForMorale: false;
  trustedForMode3Handoff: false;
  finalWarTrusted: false;
  components: {
    batting: boolean;
    pitching: boolean;
    fielding: boolean;
    baserunning: boolean;
  };
}

export interface FranchiseParkFactorTrust extends FranchiseAnalyticsTrustArea {
  statusByTeamContext: Record<FranchiseValueParkFactorStatus, number>;
  seedParkFactorsAvailable: boolean;
  customParkFactorsAvailable: boolean;
  parkAdjustedAnalyticsTrusted: false;
}

export interface FranchiseAdaptiveStandardsTrust extends FranchiseAnalyticsTrustArea {
  seasonLengthMetadataAvailable: boolean;
  inningsMetadataAvailable: boolean;
  consumerThresholdsProven: false;
  sampleSizeReady: boolean;
}

export interface FranchiseDownstreamConsumerTrust {
  salaryMovement: FranchiseAnalyticsTrustArea;
  dynamicDesignations: FranchiseAnalyticsTrustArea;
  awards: FranchiseAnalyticsTrustArea;
  moraleRelationships: FranchiseAnalyticsTrustArea;
  narrativeRandomEvents: FranchiseAnalyticsTrustArea;
  mode3Handoff: FranchiseAnalyticsTrustArea;
}

export interface FranchiseAnalyticsTrustReport {
  contractVersion: typeof FRANCHISE_ANALYTICS_TRUST_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  generatedAt: number;
  inputContractVersion: FranchiseValueInputReport['contractVersion'];
  coreStats: FranchiseAnalyticsTrustArea & {
    seasonStatsRows: number;
    completedArchiveRows: number;
    scopedArchiveRows: number;
    teamStintRows: number;
  };
  scoreOnlyBoundary: FranchiseScoreOnlyBoundaryTrust;
  wpa: FranchiseWpaTrust;
  war: FranchiseWarTrust;
  parkFactors: FranchiseParkFactorTrust;
  adaptiveStandards: FranchiseAdaptiveStandardsTrust;
  playoffBoundary: FranchiseAnalyticsTrustArea;
  downstreamConsumers: FranchiseDownstreamConsumerTrust;
  limitations: string[];
}

export interface BuildFranchiseAnalyticsTrustInput {
  valueInputReport: FranchiseValueInputReport;
  completedGames?: CompletedGameRecord[];
  scheduledGames?: ScheduledGame[];
  teamStints?: FranchisePlayerTeamStatStint[];
  playoffStatsPresent?: boolean;
}

function area(
  status: FranchiseAnalyticsTrustStatus,
  reasons: string[],
  limitations: string[] = [],
): FranchiseAnalyticsTrustArea {
  return {
    status,
    reasons,
    limitations,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasAnySeasonStats(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.seasonStatsAvailability.any);
}

function hasAnyWarPreview(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.warInputAvailability.any);
}

function hasTeamMvpWarTrust(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.warConsumerTrust?.teamMvpDesignations === true);
}

function hasAceWarTrust(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.warConsumerTrust?.aceDesignations === true);
}

function hasAnyWpa(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.wpaInputAvailability.archiveBacked);
}

function hasPlayerWpa(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.wpaInputAvailability.playerWpa);
}

function hasManagerWpa(rows: FranchiseValueInputRow[]): boolean {
  return rows.some((row) => row.wpaInputAvailability.managerWpa);
}

function hasRequiredScopeIdentity(record: {
  franchiseId?: string | null;
  seasonId?: string | null;
  statsScopeId?: string | null;
}, report: FranchiseValueInputReport): boolean {
  return (
    record.franchiseId === report.franchiseId &&
    record.seasonId === report.seasonId &&
    record.statsScopeId === report.statsScopeId
  );
}

function scopedCompletedGames(
  games: CompletedGameRecord[],
  report: FranchiseValueInputReport,
): CompletedGameRecord[] {
  return games.filter((game) =>
    hasRequiredScopeIdentity(game, report) &&
    game.aggregationStatus !== 'incomplete',
  );
}

function scoreOnlyRows(
  games: ScheduledGame[],
  report: FranchiseValueInputReport,
): ScheduledGame[] {
  return games.filter((game) =>
    hasRequiredScopeIdentity(game, report) &&
    game.status === 'COMPLETED' &&
    game.completionSource === 'score-only' &&
    Boolean(game.result),
  );
}

function buildCoreStatsTrust(
  report: FranchiseValueInputReport,
  completedGames: CompletedGameRecord[],
  teamStints: FranchisePlayerTeamStatStint[],
) {
  const scopedArchives = scopedCompletedGames(completedGames, report);
  const seasonStatsRows = report.rows.filter((row) => row.seasonStatsAvailability.any).length;
  const scopedStints = teamStints.filter((stint) =>
    hasRequiredScopeIdentity(stint, report),
  );

  if (seasonStatsRows > 0 && scopedArchives.length > 0) {
    return {
      ...area('trusted', [
        'Franchise season stat rows and scoped completed-game archives are available for read-only reporting.',
        'Completed-game archive rows preserve franchiseId, seasonId, and statsScopeId boundaries.',
      ], [
        'Trusted core stats do not promote downstream salary movement, awards, morale, relationships, or final dynamic designations.',
      ]),
      seasonStatsRows,
      completedArchiveRows: completedGames.length,
      scopedArchiveRows: scopedArchives.length,
      teamStintRows: scopedStints.length,
    };
  }

  if (seasonStatsRows > 0 || scopedArchives.length > 0) {
    return {
      ...area('preview-only', [
        'Partial franchise stat/archive evidence is available, but not enough to trust the full core analytics spine.',
      ], [
        'Read-only reports may display available facts with limitations.',
      ]),
      seasonStatsRows,
      completedArchiveRows: completedGames.length,
      scopedArchiveRows: scopedArchives.length,
      teamStintRows: scopedStints.length,
    };
  }

  return {
    ...area('blocked', [
      'No franchise season stat rows or scoped completed-game archives are available.',
    ]),
    seasonStatsRows,
    completedArchiveRows: completedGames.length,
    scopedArchiveRows: scopedArchives.length,
    teamStintRows: scopedStints.length,
  };
}

function buildScoreOnlyBoundaryTrust(
  report: FranchiseValueInputReport,
  scheduledGames: ScheduledGame[],
): FranchiseScoreOnlyBoundaryTrust {
  const rows = scoreOnlyRows(scheduledGames, report);
  if (rows.length === 0) {
    return {
      ...area('not-applicable', [
        'No score-only schedule rows were provided for this franchise season.',
      ]),
      scoreOnlyRows: 0,
      trustedForScheduleAndStandings: false,
      trustedForPlayerStats: false,
      trustedForWpa: false,
      trustedForWar: false,
      trustedForAwards: false,
      trustedForDesignations: false,
      trustedForSalaryMovement: false,
      trustedForMorale: false,
      trustedForRelationships: false,
      trustedForNarrative: false,
    };
  }

  return {
    ...area('trusted', [
      'Score-only rows are trusted for schedule result and standings context only.',
    ], [
      'Score-only rows do not create player archives, player stats, WPA, WAR, awards, designations, or narrative/random-event inputs.',
    ]),
    scoreOnlyRows: rows.length,
    trustedForScheduleAndStandings: true,
    trustedForPlayerStats: false,
    trustedForWpa: false,
    trustedForWar: false,
    trustedForAwards: false,
    trustedForDesignations: false,
    trustedForSalaryMovement: false,
    trustedForMorale: false,
    trustedForRelationships: false,
    trustedForNarrative: false,
  };
}

function buildWpaTrust(rows: FranchiseValueInputRow[]): FranchiseWpaTrust {
  const playerWpaArchiveBacked = hasPlayerWpa(rows);
  const managerWpaArchiveBacked = hasManagerWpa(rows);
  const archiveBacked = playerWpaArchiveBacked || managerWpaArchiveBacked;

  return {
    ...area(
      archiveBacked ? 'preview-only' : 'blocked',
      archiveBacked
        ? ['Archive-backed player WPA or Manager WPA is available for read-only reporting.']
        : ['No archive-backed WPA or Manager WPA input is available.'],
      [
        'WPA and Manager WPA are not trusted for final True Value, salary movement, or persisted designations in internal v1.',
      ],
    ),
    playerWpaArchiveBacked,
    managerWpaArchiveBacked,
    finalValueTrusted: false,
  };
}

function buildWarTrust(rows: FranchiseValueInputRow[]): FranchiseWarTrust {
  const components = {
    batting: rows.some((row) => row.warInputAvailability.battingWar),
    pitching: rows.some((row) => row.warInputAvailability.pitchingWar),
    fielding: rows.some((row) => row.warInputAvailability.fieldingWar),
    baserunning: rows.some((row) => row.warInputAvailability.baserunningWar),
  };
  const warLikePreviewAvailable = Object.values(components).some(Boolean);
  const trustedForTeamMvpDesignations = hasTeamMvpWarTrust(rows);
  const trustedForAceDesignations = hasAceWarTrust(rows);
  const trustedForTeamMvpAce = trustedForTeamMvpDesignations || trustedForAceDesignations;

  return {
    ...area(
      trustedForTeamMvpAce ? 'trusted' : warLikePreviewAvailable ? 'preview-only' : 'blocked',
      trustedForTeamMvpAce
        ? ['Scoped WAR inputs are trusted only for TEAM_MVP/ACE designation input gating.']
        : warLikePreviewAvailable
          ? ['WAR-like component inputs are available, but no row meets the consumer-specific TEAM_MVP/ACE trust gate.']
        : ['No WAR-like component inputs are available.'],
      [
        'Final WAR remains untrusted for True Value, value delta, awards, salary movement, morale, relationships, and Mode 3.',
        'Fan Favorite and Albatross remain blocked because True Value/value-delta trust is not promoted by WAR input trust.',
      ],
    ),
    warLikePreviewAvailable,
    trustedForTeamMvpDesignations,
    trustedForAceDesignations,
    trustedForFanFavoriteAlbatrossDesignations: false,
    trustedForAwards: false,
    trustedForSalaryMovement: false,
    trustedForTrueValue: false,
    trustedForMorale: false,
    trustedForMode3Handoff: false,
    finalWarTrusted: false,
    components,
  };
}

function buildParkFactorTrust(rows: FranchiseValueInputRow[]): FranchiseParkFactorTrust {
  const statusByTeamContext: Record<FranchiseValueParkFactorStatus, number> = {
    'seed-only': 0,
    'custom-unavailable': 0,
    unadjusted: 0,
  };
  for (const row of rows) {
    statusByTeamContext[row.parkFactorAvailability.status] += 1;
  }
  const seedParkFactorsAvailable = statusByTeamContext['seed-only'] > 0;
  const missingOrUnadjusted = statusByTeamContext.unadjusted > 0;
  const customUnavailable = statusByTeamContext['custom-unavailable'] > 0;
  const status: FranchiseAnalyticsTrustStatus =
    missingOrUnadjusted ? 'blocked' :
    seedParkFactorsAvailable && !customUnavailable ? 'trusted' :
    customUnavailable ? 'preview-only' :
    'blocked';

  return {
    ...area(
      status,
      status === 'trusted'
        ? ['Stored stadium identity and seed park-factor context are available.']
        : status === 'preview-only'
          ? ['Stadium identity exists, but custom/dynamic park factors are unavailable.']
          : ['Park-factor or stadium identity inputs are missing for at least one player/team context.'],
      [
        'Seed/stored park identity can be reported, but custom, dynamic, and blended park-factor analytics are not active in internal v1.',
      ],
    ),
    statusByTeamContext,
    seedParkFactorsAvailable,
    customParkFactorsAvailable: false,
    parkAdjustedAnalyticsTrusted: false,
  };
}

function buildAdaptiveTrust(report: FranchiseValueInputReport): FranchiseAdaptiveStandardsTrust {
  const seasonLengthMetadataAvailable = report.seasonContext.gamesPerTeam !== null;
  const inningsMetadataAvailable = report.seasonContext.inningsPerGame !== null;
  const sampleSizeReady = hasAnySeasonStats(report.rows) && seasonLengthMetadataAvailable && inningsMetadataAvailable;
  const metadataAvailable = seasonLengthMetadataAvailable && inningsMetadataAvailable;

  return {
    ...area(
      metadataAvailable ? 'preview-only' : 'blocked',
      metadataAvailable
        ? ['Stored season length and innings metadata are available.']
        : ['Stored season length or innings metadata is missing.'],
      [
        'Consumer-specific adaptive thresholds are not yet proven, so adaptive/final analytics remain preview-only or blocked.',
      ],
    ),
    seasonLengthMetadataAvailable,
    inningsMetadataAvailable,
    consumerThresholdsProven: false,
    sampleSizeReady,
  };
}

function buildPlayoffBoundaryTrust(report: FranchiseValueInputReport, playoffStatsPresent: boolean | undefined): FranchiseAnalyticsTrustArea {
  if (playoffStatsPresent) {
    return area('trusted', [
      'Playoff stat presence is explicitly identified separately from regular-season stats.',
    ], [
      'Regular-season and playoff stat consumers must continue to use their scoped boundaries.',
    ]);
  }

  if (report.statsScopeId === report.seasonId) {
    return area('trusted', [
      'Regular-season stats scope matches the franchise season scope.',
    ], [
      'No playoff stat payload was provided to this trust report.',
    ]);
  }

  return area('preview-only', [
    'Stats scope differs from season scope; consumers must verify playoff/regular-season boundary before use.',
  ]);
}

function buildDownstreamConsumers(params: {
  coreStats: FranchiseAnalyticsTrustArea;
  wpa: FranchiseWpaTrust;
  war: FranchiseWarTrust;
  adaptiveStandards: FranchiseAdaptiveStandardsTrust;
}): FranchiseDownstreamConsumerTrust {
  return {
    salaryMovement: area('blocked', [
      'Salary movement is blocked because canonical True Value, trusted final WAR/WPA, and salary lifecycle inputs are not approved for recalculation.',
    ]),
    dynamicDesignations: area(
      params.war.trustedForTeamMvpDesignations || params.war.trustedForAceDesignations ? 'trusted' : params.war.warLikePreviewAvailable ? 'preview-only' : 'blocked',
      params.war.trustedForTeamMvpDesignations || params.war.trustedForAceDesignations
        ? ['TEAM_MVP/ACE designation input gating can trust scoped WAR rows that pass the explicit consumer contract.']
        : params.war.warLikePreviewAvailable
          ? ['TEAM_MVP/ACE-style designation eligibility may be preview-only from stats/WAR-like inputs, but the trusted consumer gate is not satisfied.']
        : ['Dynamic designation inputs are missing or untrusted.'],
      [
        'No designation records are persistable from the analytics trust report.',
        'Fan Favorite, Albatross, Cornerstone, Captain, Fan Hopeful, awards, morale, and Mode 3 remain blocked.',
      ],
    ),
    awards: area('preview-only', [
      'Award-style output may be shown only as stat leader/preview reporting, not finalized awards.',
    ]),
    moraleRelationships: area('blocked', [
      'Morale and relationship systems are not canonical analytics consumers in internal v1.',
    ]),
    narrativeRandomEvents: area('blocked', [
      'Narrative/random-event mutation is blocked; stable game facts may be used only for read-only summaries.',
    ]),
    mode3Handoff: area(
      params.coreStats.status === 'trusted' ? 'preview-only' : 'blocked',
      params.coreStats.status === 'trusted'
        ? ['Core stat/archive facts may be handed off as read-only evidence, while derived systems remain conditional.']
        : ['Mode 3 handoff cannot trust analytics without core stat/archive evidence.'],
      ['Mode 3/offseason execution remains deferred in internal v1.'],
    ),
  };
}

export function buildFranchiseAnalyticsTrustReport(
  input: BuildFranchiseAnalyticsTrustInput,
): FranchiseAnalyticsTrustReport {
  const report = input.valueInputReport;
  const completedGames = input.completedGames ?? [];
  const scheduledGames = input.scheduledGames ?? [];
  const teamStints = input.teamStints ?? [];
  const coreStats = buildCoreStatsTrust(report, completedGames, teamStints);
  const scoreOnlyBoundary = buildScoreOnlyBoundaryTrust(report, scheduledGames);
  const wpa = buildWpaTrust(report.rows);
  const war = buildWarTrust(report.rows);
  const parkFactors = buildParkFactorTrust(report.rows);
  const adaptiveStandards = buildAdaptiveTrust(report);
  const playoffBoundary = buildPlayoffBoundaryTrust(report, input.playoffStatsPresent);
  const downstreamConsumers = buildDownstreamConsumers({
    coreStats,
    wpa,
    war,
    adaptiveStandards,
  });

  return {
    contractVersion: FRANCHISE_ANALYTICS_TRUST_CONTRACT_VERSION,
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    generatedAt: Date.now(),
    inputContractVersion: report.contractVersion,
    coreStats,
    scoreOnlyBoundary,
    wpa,
    war,
    parkFactors,
    adaptiveStandards,
    playoffBoundary,
    downstreamConsumers,
    limitations: unique([
      'Read-only trust report only; it does not calculate WAR, True Value, salary movement, awards, morale, relationships, narrative events, or Mode 3 execution.',
      ...report.limitations,
      ...coreStats.limitations,
      ...scoreOnlyBoundary.limitations,
      ...wpa.limitations,
      ...war.limitations,
      ...parkFactors.limitations,
      ...adaptiveStandards.limitations,
      ...playoffBoundary.limitations,
      ...Object.values(downstreamConsumers).flatMap((consumer) => consumer.limitations),
    ]),
  };
}
