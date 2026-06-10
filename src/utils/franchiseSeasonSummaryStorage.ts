import {
  getFranchiseSeasonId,
  getFranchiseSeasonHandoffKey,
  type FranchiseSeasonHandoff,
  buildFranchiseSeasonHandoff,
} from './franchisePersistenceContract';
import { getFranchiseConfig } from './franchiseManager';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player,
} from './franchisePlayerStorage';
import {
  getAllGamesByFranchise,
  type ScheduledGame,
} from './scheduleStorage';
import {
  getRecentGames,
  type CompletedGameRecord,
} from './gameStorage';
import {
  calculateStandings,
  getAllFieldingStats,
  getSeasonBattingStats,
  getSeasonMetadata,
  getSeasonPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonFielding,
  type PlayerSeasonPitching,
  type SeasonMetadata,
  type TeamStanding,
} from './seasonStorage';
import {
  getPlayoff,
  getPlayoffByFranchiseSeason,
  getPlayoffStats,
  type PlayoffConfig,
  type PlayoffPlayerStats,
} from './playoffStorage';
import {
  buildFranchisePlayerTeamStatStints,
  type FranchisePlayerTeamStatStint,
} from './franchiseStatAttribution';
import { getOffseasonState } from './offseasonStorage';
import { getTransactionsByFranchiseSeason } from './transactionStorage';
import {
  buildFranchiseStadiumFoundationReport,
  type FranchiseStadiumFoundationReport,
} from './franchiseStadiumFoundation';
import { getTrackerDb } from './trackerDb';
import { syncEngine } from './syncEngine';

const STORE_NAME = 'franchiseSeasonSummaries';

export interface FranchiseSeasonSummaryPlaceholder {
  status: 'placeholder';
  reason: string;
}

export interface FranchiseSeasonSummaryScheduleGame {
  id: string;
  gameNumber: number;
  dayNumber: number;
  awayTeamId: string;
  homeTeamId: string;
  status: ScheduledGame['status'];
  result?: ScheduledGame['result'];
  gameLogId?: string;
  completedAt?: number;
}

export interface FranchiseSeasonSummaryCompletedGame {
  gameId: string;
  date: number;
  seasonId?: string;
  statsScopeId?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  competitionType?: CompletedGameRecord['competitionType'];
  competitionId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  finalScore: CompletedGameRecord['finalScore'];
  innings: number;
  totalInnings?: number;
  stadiumName?: string | null;
}

export type FranchiseSeasonSummaryManifestStatus = 'season-complete' | 'incomplete' | 'blocked';

export type FranchiseSeasonSummaryManifestCategoryStatus =
  | 'included'
  | 'trusted'
  | 'blocked'
  | 'deferred'
  | 'incomplete'
  | 'not-applicable';

export interface FranchiseSeasonSummaryManifestCategory {
  key: string;
  label: string;
  status: FranchiseSeasonSummaryManifestCategoryStatus;
  detail: string;
  count?: number;
  blockers: string[];
  warnings: string[];
}

export interface FranchiseSeasonSummaryManifest {
  contractVersion: 'franchise-season-summary-no-awards-manifest-v1';
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  status: FranchiseSeasonSummaryManifestStatus;
  readOnly: true;
  hiddenSafe: true;
  categories: FranchiseSeasonSummaryManifestCategory[];
  blockers: string[];
  warnings: string[];
  policyFlags: {
    awardsImplemented: false;
    watchlistsImplemented: false;
    finalTrueValueAllowed: false;
    valueDeltaTrusted: false;
    blockedDesignationPromotionAllowed: false;
    moraleAutomationAllowed: false;
    relationshipMutationAllowed: false;
    salaryMovementAllowed: false;
    mode3ExecutionAllowed: false;
    seasonRolloverAllowed: false;
    generatedSchedulesAllowed: false;
    aiSimulationAllowed: false;
    aiTradesAllowed: false;
  };
}

export interface FranchiseSeasonSummary {
  id: string;
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  statsScopeId: string;
  createdAt: number;
  updatedAt: number;
  handoff: FranchiseSeasonHandoff;
  seasonMetadata: SeasonMetadata | null;
  schedule: {
    franchiseId: string;
    seasonNumber: number;
    totalGames: number;
    gameIds: string[];
    completedGameIds: string[];
    skippedGameIds: string[];
    games: FranchiseSeasonSummaryScheduleGame[];
  };
  completedGames: {
    query: {
      franchiseId: string;
      seasonId: string;
    };
    gameIds: string[];
    games: FranchiseSeasonSummaryCompletedGame[];
  };
  standings: {
    generatedAt: number;
    teams: TeamStanding[];
  };
  seasonStats: {
    batting: PlayerSeasonBatting[];
    pitching: PlayerSeasonPitching[];
    fielding: PlayerSeasonFielding[];
    teamStints?: FranchisePlayerTeamStatStint[];
  };
  playoffs: {
    playoffId?: string;
    status: 'none' | 'present';
    config?: PlayoffConfig;
    playerStats?: PlayoffPlayerStats[];
  };
  manifest: FranchiseSeasonSummaryManifest;
  offseasonStateId: string;
  awards: FranchiseSeasonSummaryPlaceholder;
  milestones: FranchiseSeasonSummaryPlaceholder;
  fanMorale: FranchiseSeasonSummaryPlaceholder;
  narrative: FranchiseSeasonSummaryPlaceholder;
  parkFactors: FranchiseSeasonSummaryPlaceholder;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function placeholder(reason: string): FranchiseSeasonSummaryPlaceholder {
  return { status: 'placeholder', reason };
}

function manifestCategory(
  key: string,
  label: string,
  status: FranchiseSeasonSummaryManifestCategoryStatus,
  detail: string,
  options: Partial<Pick<FranchiseSeasonSummaryManifestCategory, 'count' | 'blockers' | 'warnings'>> = {},
): FranchiseSeasonSummaryManifestCategory {
  return {
    key,
    label,
    status,
    detail,
    count: options.count,
    blockers: options.blockers ?? [],
    warnings: options.warnings ?? [],
  };
}

function rosterAssignment(player: Player, franchiseId: string) {
  return (
    player.leagueAssignments?.find((assignment) =>
      assignment.leagueId === franchiseId &&
      (assignment.rosterStatus === 'MLB' || assignment.rosterStatus === 'FARM'),
    ) ??
    player.leagueAssignments?.find((assignment) =>
      assignment.rosterStatus === 'MLB' || assignment.rosterStatus === 'FARM',
    )
  );
}

function buildRosterCounts(players: Player[], franchiseId: string) {
  return players.reduce((counts, player) => {
    const assignment = rosterAssignment(player, franchiseId);
    if (!assignment) return counts;
    counts.total += 1;
    if (assignment.rosterStatus === 'MLB') counts.mlb += 1;
    if (assignment.rosterStatus === 'FARM') {
      counts.farm += 1;
      if (player.ratingRevealState === 'revealed') counts.revealedFarm += 1;
      else counts.hiddenFarm += 1;
    }
    if (assignment.rosterStatus === 'FREE_AGENT') counts.freeAgent += 1;
    return counts;
  }, {
    total: 0,
    mlb: 0,
    farm: 0,
    freeAgent: 0,
    hiddenFarm: 0,
    revealedFarm: 0,
  });
}

function countActiveDesignations(players: Player[], seasonId: string, statsScopeId: string) {
  return players.reduce((counts, player) => {
    const records = (player as Player & {
      franchiseDesignations?: Array<{
        type?: string;
        status?: string;
        seasonId?: string;
        statsScopeId?: string;
      }>;
    }).franchiseDesignations ?? [];
    for (const record of records) {
      if (record.seasonId && record.seasonId !== seasonId) continue;
      if (record.statsScopeId && record.statsScopeId !== statsScopeId) continue;
      if (record.status !== 'active') continue;
      if (record.type === 'TEAM_MVP') counts.teamMvp += 1;
      if (record.type === 'ACE') counts.ace += 1;
    }
    return counts;
  }, { teamMvp: 0, ace: 0 });
}

function isScheduleCompleteForSummary(game: ScheduledGame): boolean {
  return game.status === 'COMPLETED' || game.status === 'SKIPPED';
}

function countScoreOnlyCompletedGames(scheduleGames: ScheduledGame[]): number {
  return scheduleGames.filter((game) =>
    game.status === 'COMPLETED' &&
    (!game.gameLogId || String(game.gameLogId).trim().length === 0),
  ).length;
}

function managerEvidenceCounts(completedGames: CompletedGameRecord[]) {
  return completedGames.reduce((counts, game) => {
    counts.decisions += game.managerDecisions?.length ?? 0;
    counts.deploymentStints += game.managerDeploymentStints?.length ?? 0;
    counts.lineupDeltas += game.managerLineupDeltas?.length ?? 0;
    counts.managerTotals += game.managerWpaTotals?.length ?? 0;
    return counts;
  }, {
    decisions: 0,
    deploymentStints: 0,
    lineupDeltas: 0,
    managerTotals: 0,
  });
}

function buildNoAwardsManifest(input: {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  generatedAt: number;
  scheduleGames: ScheduledGame[];
  completedGames: CompletedGameRecord[];
  standings: TeamStanding[];
  playoff: PlayoffConfig | null;
  players: Player[];
  teams: unknown[];
  salaryBaseline: {
    playerCount: number;
    salariedPlayerCount: number;
    totalSalary: number;
    teamPayrolls: Record<string, number>;
  } | null;
  transactionCount: number;
  stadiumReport: FranchiseStadiumFoundationReport;
}): FranchiseSeasonSummaryManifest {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const categories: FranchiseSeasonSummaryManifestCategory[] = [];
  const incompleteScheduleRows = input.scheduleGames.filter((game) => !isScheduleCompleteForSummary(game));
  const scoreOnlyRows = countScoreOnlyCompletedGames(input.scheduleGames);

  if (input.scheduleGames.length === 0) {
    blockers.push('No regular-season schedule rows are available for season-complete review.');
  }
  if (incompleteScheduleRows.length > 0) {
    blockers.push(`${incompleteScheduleRows.length} regular-season schedule row(s) are not complete.`);
  }
  if (input.playoff && input.playoff.status !== 'COMPLETED') {
    warnings.push('Playoff bracket exists but is not completed, so playoff results are included as in-progress context only.');
  }

  categories.push(manifestCategory(
    'final-standings',
    'Final standings',
    input.standings.length > 0 ? 'trusted' : 'incomplete',
    input.standings.length > 0
      ? `${input.standings.length} team standing row(s) captured from the scoped season.`
      : 'No scoped standings rows are available.',
    {
      count: input.standings.length,
      blockers: input.standings.length === 0 ? ['Final standings are required before a season-complete manifest can be trusted.'] : [],
    },
  ));

  categories.push(manifestCategory(
    'regular-season-schedule',
    'Regular-season schedule',
    incompleteScheduleRows.length === 0 && input.scheduleGames.length > 0 ? 'trusted' : 'incomplete',
    `${input.scheduleGames.length} schedule row(s), ${input.scheduleGames.filter((game) => game.status === 'COMPLETED').length} completed, ${input.scheduleGames.filter((game) => game.status === 'SKIPPED').length} skipped.`,
    {
      count: input.scheduleGames.length,
      blockers: incompleteScheduleRows.length > 0 ? [`${incompleteScheduleRows.length} schedule row(s) remain unplayed or unresolved.`] : [],
      warnings: scoreOnlyRows > 0
        ? [`${scoreOnlyRows} score-only completed row(s) count for standings but do not create player stats, WPA, awards, or Almanac player evidence.`]
        : [],
    },
  ));

  categories.push(manifestCategory(
    'playoff-results',
    'Playoff bracket and results',
    input.playoff
      ? input.playoff.status === 'COMPLETED' ? 'trusted' : 'incomplete'
      : 'not-applicable',
    input.playoff
      ? `Playoff ${input.playoff.id} is ${input.playoff.status}.`
      : 'No scoped playoff bracket is attached to this season summary.',
    {
      count: input.playoff ? 1 : 0,
      warnings: input.playoff && input.playoff.status !== 'COMPLETED'
        ? ['Playoff results are not complete and cannot be treated as final season output.']
        : [],
    },
  ));

  const rosterCounts = buildRosterCounts(input.players, input.franchiseId);
  categories.push(manifestCategory(
    'roster-farm-state',
    'Roster and FARM state',
    rosterCounts.total > 0 ? 'included' : 'incomplete',
    `${rosterCounts.mlb} MLB player(s), ${rosterCounts.farm} FARM player(s), ${rosterCounts.hiddenFarm} hidden FARM prospect(s), ${input.teams.length} team record(s).`,
    {
      count: rosterCounts.total,
      blockers: rosterCounts.total === 0 ? ['No franchise-owned player records were available for roster/FARM summary.'] : [],
    },
  ));

  categories.push(manifestCategory(
    'salary-payroll-current',
    'Salary and payroll current state',
    input.salaryBaseline ? 'included' : 'incomplete',
    input.salaryBaseline
      ? `${input.salaryBaseline.salariedPlayerCount}/${input.salaryBaseline.playerCount} salaried player(s); ${Object.keys(input.salaryBaseline.teamPayrolls).length} team payroll baseline row(s).`
      : 'No scoped salary baseline proof is available from the franchise config.',
    {
      count: input.salaryBaseline?.salariedPlayerCount ?? 0,
      blockers: input.salaryBaseline ? [] : ['Salary/payroll current-state proof is missing.'],
      warnings: ['Salary movement remains blocked; this category reports current salary/payroll state only.'],
    },
  ));

  categories.push(manifestCategory(
    'transaction-history',
    'Transaction history',
    'included',
    `${input.transactionCount} scoped transaction row(s) captured for review.`,
    { count: input.transactionCount },
  ));

  const designationCounts = countActiveDesignations(input.players, input.seasonId, input.statsScopeId);
  categories.push(manifestCategory(
    'active-designations',
    'Active TEAM_MVP / ACE designations',
    designationCounts.teamMvp + designationCounts.ace > 0 ? 'included' : 'incomplete',
    `${designationCounts.teamMvp} TEAM_MVP and ${designationCounts.ace} ACE active designation record(s) found for this season.`,
    {
      count: designationCounts.teamMvp + designationCounts.ace,
      warnings: designationCounts.teamMvp + designationCounts.ace === 0
        ? ['No active TEAM_MVP/ACE records are present; this may be valid before designation sync runs.']
        : [],
    },
  ));

  categories.push(manifestCategory(
    'blocked-designation-families',
    'Blocked/deferred designation families',
    'blocked',
    'Fan Favorite, Albatross, Cornerstone, Captain, and Fan Hopeful remain blocked/deferred for v1.',
    {
      blockers: [
        'Final True Value/value delta, fan attachment, hidden charisma/leadership safety, and durable carryover policy are not approved.',
      ],
    },
  ));

  categories.push(manifestCategory(
    'almanac-continuity',
    'Almanac and completed-game continuity',
    input.completedGames.length > 0 ? 'included' : 'incomplete',
    `${input.completedGames.length} completed archive row(s), ${input.completedGames.filter((game) => game.aggregationStatus !== 'incomplete').length} stat-bearing/non-incomplete archive row(s).`,
    {
      count: input.completedGames.length,
      warnings: scoreOnlyRows > 0
        ? ['Score-only rows are schedule/standings context only and are not counted as player archive evidence.']
        : [],
    },
  ));

  categories.push(manifestCategory(
    'stadium-spray-evidence',
    'Stadium and spray evidence',
    input.stadiumReport.sprayCharts.summary.rows > 0 ? 'included' : 'incomplete',
    `${input.stadiumReport.stadiumIdentity.stadiums.length} stadium identity row(s); ${input.stadiumReport.sprayCharts.summary.rows} scoped spray evidence row(s).`,
    {
      count: input.stadiumReport.sprayCharts.summary.rows,
      warnings: input.stadiumReport.sprayCharts.summary.rows === 0
        ? ['No scoped spray event detail exists; stadium identity/sample rows may still be available.']
        : [],
    },
  ));

  const managerCounts = managerEvidenceCounts(input.completedGames);
  const managerEvidenceTotal = managerCounts.decisions + managerCounts.deploymentStints + managerCounts.lineupDeltas + managerCounts.managerTotals;
  categories.push(manifestCategory(
    'manager-wpa-visibility',
    'Manager WPA visibility',
    managerEvidenceTotal > 0 ? 'included' : 'incomplete',
    `${managerCounts.decisions} decision row(s), ${managerCounts.deploymentStints} deployment stint(s), ${managerCounts.lineupDeltas} lineup delta row(s), ${managerCounts.managerTotals} manager WPA total row(s).`,
    {
      count: managerEvidenceTotal,
      warnings: managerEvidenceTotal === 0
        ? ['Older archives and score-only rows may not contain manager WPA evidence and are not backfilled.']
        : [],
    },
  ));

  categories.push(manifestCategory(
    'save-export-delete-scope',
    'Save/export/delete scope',
    'included',
    'Season summaries and Mode 2 evidence stores are registered in the franchise save-slot/export/delete portability manifest.',
  ));

  categories.push(manifestCategory(
    'awards-watchlists',
    'Awards and watchlists',
    'blocked',
    'Awards/watchlists are omitted from the v1 season-complete manifest until the Final WAR / Award Trust Promotion Gate passes.',
    {
      blockers: ['finalWarTrusted and trustedForAwards remain false; award-specific True Value/milestone/adaptive thresholds are not proven.'],
    },
  ));

  categories.push(manifestCategory(
    'true-value-value-delta',
    'Final True Value and value delta',
    'blocked',
    'Position-relative True Value and expected wins remain preview/read-only and are not final handoff authority.',
    {
      blockers: ['Final True Value, persisted value delta, Fan Favorite, and Albatross promotion remain blocked.'],
    },
  ));

  categories.push(manifestCategory(
    'mode3-offseason-rollover',
    'Mode 3/offseason and season rollover',
    'blocked',
    'No Mode 3 execution, offseason execution, or season rollover path is enabled by this summary.',
    {
      blockers: ['Season rollover storage and carryover policy are future work.'],
    },
  ));

  categories.push(manifestCategory(
    'morale-relationship-automation',
    'Morale and relationship automation',
    'blocked',
    'Morale/relationship state changes remain manual/confirmation-gated where already implemented and are not automated by season completion.',
    {
      blockers: ['Relationship mutation, automatic morale drift, and story/offseason effects remain disabled.'],
    },
  ));

  return {
    contractVersion: 'franchise-season-summary-no-awards-manifest-v1',
    generatedAt: input.generatedAt,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    status: blockers.length > 0 ? 'incomplete' : 'season-complete',
    readOnly: true,
    hiddenSafe: true,
    categories,
    blockers,
    warnings,
    policyFlags: {
      awardsImplemented: false,
      watchlistsImplemented: false,
      finalTrueValueAllowed: false,
      valueDeltaTrusted: false,
      blockedDesignationPromotionAllowed: false,
      moraleAutomationAllowed: false,
      relationshipMutationAllowed: false,
      salaryMovementAllowed: false,
      mode3ExecutionAllowed: false,
      seasonRolloverAllowed: false,
      generatedSchedulesAllowed: false,
      aiSimulationAllowed: false,
      aiTradesAllowed: false,
    },
  };
}

function toScheduleSnapshot(game: ScheduledGame): FranchiseSeasonSummaryScheduleGame {
  return {
    id: game.id,
    gameNumber: game.gameNumber,
    dayNumber: game.dayNumber,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    status: game.status,
    result: game.result ? deepClone(game.result) : undefined,
    gameLogId: game.gameLogId,
    completedAt: game.completedAt,
  };
}

function toCompletedGameSnapshot(game: CompletedGameRecord): FranchiseSeasonSummaryCompletedGame {
  return {
    gameId: game.gameId,
    date: game.date,
    seasonId: game.seasonId,
    statsScopeId: game.statsScopeId,
    franchiseId: game.franchiseId,
    scheduleGameId: game.scheduleGameId,
    competitionType: game.competitionType,
    competitionId: game.competitionId,
    playoffId: game.playoffId,
    playoffSeriesId: game.playoffSeriesId,
    playoffGameNumber: game.playoffGameNumber,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    awayTeamName: game.awayTeamName,
    homeTeamName: game.homeTeamName,
    finalScore: deepClone(game.finalScore),
    innings: game.innings,
    totalInnings: game.totalInnings,
    stadiumName: game.stadiumName,
  };
}

async function resolvePlayoff(
  franchiseId: string,
  seasonNumber: number,
  playoffId?: string,
): Promise<PlayoffConfig | null> {
  if (playoffId) {
    const playoff = await getPlayoff(playoffId);
    const expectedSeasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
    if (!playoff) {
      return null;
    }
    if (playoff.franchiseId !== franchiseId) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different franchise:', playoffId);
      return null;
    }
    if (playoff.seasonId && playoff.seasonId !== expectedSeasonId) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different seasonId:', playoffId);
      return null;
    }
    if (playoff.seasonNumber !== undefined && playoff.seasonNumber !== seasonNumber) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different seasonNumber:', playoffId);
      return null;
    }
    return playoff;
  }
  return getPlayoffByFranchiseSeason({
    franchiseId,
    seasonNumber,
    seasonId: getFranchiseSeasonId(franchiseId, seasonNumber),
  });
}

export async function buildFranchiseSeasonSummary(params: {
  franchiseId: string;
  seasonNumber: number;
  playoffId?: string;
}): Promise<FranchiseSeasonSummary> {
  const seasonId = getFranchiseSeasonId(params.franchiseId, params.seasonNumber);
  const [
    scheduleGames,
    completedGames,
    standings,
    batting,
    pitching,
    fielding,
    seasonMetadata,
    playoff,
    offseasonState,
    players,
    teams,
    config,
    transactions,
  ] = await Promise.all([
    getAllGamesByFranchise(params.franchiseId, params.seasonNumber),
    getRecentGames(1000, { franchiseId: params.franchiseId, seasonId }),
    calculateStandings(seasonId),
    getSeasonBattingStats(seasonId),
    getSeasonPitchingStats(seasonId),
    getAllFieldingStats(seasonId),
    getSeasonMetadata(seasonId),
    resolvePlayoff(params.franchiseId, params.seasonNumber, params.playoffId),
    getOffseasonState(seasonId).catch(() => null),
    getAllFranchisePlayers(params.franchiseId).catch(() => []),
    getAllFranchiseTeams(params.franchiseId).catch(() => []),
    getFranchiseConfig(params.franchiseId).catch(() => null),
    getTransactionsByFranchiseSeason(params.franchiseId, seasonId).catch(() => []),
  ]);

  const playoffStats = playoff ? await getPlayoffStats(playoff.id) : undefined;
  const handoff = buildFranchiseSeasonHandoff({
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    playoffId: playoff?.id,
  });
  const now = Date.now();
  const completedScheduleIds = scheduleGames
    .filter((game) => game.status === 'COMPLETED')
    .map((game) => game.id);
  const skippedScheduleIds = scheduleGames
    .filter((game) => game.status === 'SKIPPED')
    .map((game) => game.id);
  const stadiumReport = buildFranchiseStadiumFoundationReport({
    franchiseId: params.franchiseId,
    seasonId,
    statsScopeId: seasonId,
    seasonNumber: params.seasonNumber,
    stadiumSnapshots: config?.stadiums ?? [],
    completedGames,
  });
  const manifest = buildNoAwardsManifest({
    franchiseId: params.franchiseId,
    seasonId,
    statsScopeId: seasonId,
    seasonNumber: params.seasonNumber,
    generatedAt: now,
    scheduleGames,
    completedGames,
    standings,
    playoff,
    players,
    teams,
    salaryBaseline: config?.salaryBaseline ?? null,
    transactionCount: transactions.length,
    stadiumReport,
  });

  return {
    id: seasonId,
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    seasonId,
    statsScopeId: seasonId,
    createdAt: now,
    updatedAt: now,
    handoff,
    seasonMetadata: seasonMetadata ? deepClone(seasonMetadata) : null,
    schedule: {
      franchiseId: params.franchiseId,
      seasonNumber: params.seasonNumber,
      totalGames: scheduleGames.length,
      gameIds: scheduleGames.map((game) => game.id),
      completedGameIds: completedScheduleIds,
      skippedGameIds: skippedScheduleIds,
      games: scheduleGames.map(toScheduleSnapshot),
    },
    completedGames: {
      query: {
        franchiseId: params.franchiseId,
        seasonId,
      },
      gameIds: completedGames.map((game) => game.gameId),
      games: completedGames.map(toCompletedGameSnapshot),
    },
    standings: {
      generatedAt: now,
      teams: deepClone(standings),
    },
    seasonStats: {
      batting: deepClone(batting),
      pitching: deepClone(pitching),
      fielding: deepClone(fielding),
      teamStints: buildFranchisePlayerTeamStatStints(completedGames, {
        franchiseId: params.franchiseId,
        seasonId,
        statsScopeId: seasonId,
        competitionType: 'franchise',
      }),
    },
    playoffs: playoff
      ? {
          playoffId: playoff.id,
          status: 'present',
          config: deepClone(playoff),
          playerStats: deepClone(playoffStats ?? []),
        }
      : {
          status: 'none',
        },
    manifest,
    offseasonStateId: offseasonState?.id ?? handoff.offseasonStateId,
    awards: placeholder('Awards are not finalized in Mode 2 v1 persisted season summaries.'),
    milestones: placeholder('Milestone storage is not yet promoted into the franchise season summary payload.'),
    fanMorale: placeholder('Fan morale is not finalized in Mode 2 v1 and global prototype data is excluded from persisted summaries.'),
    narrative: placeholder('Narrative/news recaps are currently generated from completed games at display time.'),
    parkFactors: placeholder('Park-factor and adaptive-standard season summaries are not yet persisted by franchise season.'),
  };
}

export async function saveFranchiseSeasonSummary(
  summary: FranchiseSeasonSummary,
): Promise<FranchiseSeasonSummary> {
  const db = await getTrackerDb();
  const record = deepClone({
    ...summary,
    id: summary.seasonId,
    updatedAt: Date.now(),
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) {
        syncEngine.upsert('kbl-tracker', STORE_NAME, record.seasonId, record);
      }
      resolve(deepClone(record));
    };
  });
}

export async function createFranchiseSeasonSummary(params: {
  franchiseId: string;
  seasonNumber: number;
  playoffId?: string;
}): Promise<FranchiseSeasonSummary> {
  const summary = await buildFranchiseSeasonSummary(params);
  const saved = await saveFranchiseSeasonSummary(summary);
  const handoffKey = getFranchiseSeasonHandoffKey(params.franchiseId, params.seasonNumber);
  localStorage.setItem(handoffKey, JSON.stringify(saved.handoff));
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsertLocal(handoffKey, saved.handoff);
  }
  return saved;
}

export async function getFranchiseSeasonSummary(
  seasonId: string,
): Promise<FranchiseSeasonSummary | null> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? deepClone(request.result as FranchiseSeasonSummary) : null);
    };
  });
}

export async function getFranchiseSeasonSummaryByFranchise(
  franchiseId: string,
  seasonNumber: number,
): Promise<FranchiseSeasonSummary | null> {
  return getFranchiseSeasonSummary(getFranchiseSeasonId(franchiseId, seasonNumber));
}

export async function deleteFranchiseSeasonSummary(seasonId: string): Promise<void> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) {
        syncEngine.remove('kbl-tracker', STORE_NAME, seasonId);
      }
      resolve();
    };
  });
}
