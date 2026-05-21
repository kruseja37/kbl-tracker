/**
 * Canonical franchise persistence contract.
 *
 * This file defines the durable identifiers and storage scopes used by
 * franchise mode. It is intentionally small: the goal is to make setup,
 * schedule, GameTracker, and season aggregation agree on the same ids.
 */

export const FRANCHISE_DATABASE_PREFIX = 'kbl-franchise-';

export type FranchisePersistenceScope =
  | 'per-franchise-db'
  | 'global-franchise-scoped'
  | 'global-season-scoped'
  | 'global-template';

export interface FranchisePersistenceStoreContract {
  store: string;
  databaseName: string;
  scope: FranchisePersistenceScope;
  requiredKeys: string[];
  notes: string;
}

export function getFranchiseDatabaseName(franchiseId: string): string {
  return `${FRANCHISE_DATABASE_PREFIX}${franchiseId}`;
}

export function getFranchiseSeasonId(
  franchiseId: string,
  seasonNumber: number,
): string {
  return `${franchiseId}-season-${seasonNumber}`;
}

export function getSeasonIdForScope(
  franchiseId: string | null | undefined,
  seasonNumber: number,
): string {
  return franchiseId
    ? getFranchiseSeasonId(franchiseId, seasonNumber)
    : `season-${seasonNumber}`;
}

export function getFranchiseSeasonName(seasonNumber: number): string {
  return `Season ${seasonNumber}`;
}

export function getFranchiseSeasonHandoffKey(
  franchiseId: string,
  seasonNumber: number,
): string {
  return `kbl_franchise_season_handoff_${franchiseId}_${seasonNumber}`;
}

export interface FranchiseSeasonHandoff {
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  statsScopeId: string;
  seasonSummaryId: string;
  scheduleScope: {
    franchiseId: string;
    seasonNumber: number;
  };
  completedGamesQuery: {
    franchiseId: string;
    seasonId: string;
  };
  playoffId?: string;
  offseasonStateId: string;
}

export function buildFranchiseSeasonHandoff(params: {
  franchiseId: string;
  seasonNumber: number;
  playoffId?: string;
}): FranchiseSeasonHandoff {
  const seasonId = getFranchiseSeasonId(params.franchiseId, params.seasonNumber);

  return {
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    seasonId,
    statsScopeId: seasonId,
    seasonSummaryId: seasonId,
    scheduleScope: {
      franchiseId: params.franchiseId,
      seasonNumber: params.seasonNumber,
    },
    completedGamesQuery: {
      franchiseId: params.franchiseId,
      seasonId,
    },
    playoffId: params.playoffId,
    offseasonStateId: `offseason-${seasonId}`,
  };
}

export const FRANCHISE_PERSISTENCE_CONTRACT: FranchisePersistenceStoreContract[] = [
  {
    store: 'players',
    databaseName: `${FRANCHISE_DATABASE_PREFIX}{franchiseId}`,
    scope: 'per-franchise-db',
    requiredKeys: ['player.id'],
    notes: 'Franchise-owned player snapshots copied from the selected League Builder league at setup.',
  },
  {
    store: 'teams',
    databaseName: `${FRANCHISE_DATABASE_PREFIX}{franchiseId}`,
    scope: 'per-franchise-db',
    requiredKeys: ['team.id'],
    notes: 'Franchise-owned team snapshots and franchise-specific lineup benchmarks.',
  },
  {
    store: 'scheduledGames',
    databaseName: 'kbl-schedule',
    scope: 'global-franchise-scoped',
    requiredKeys: ['game.id', 'game.franchiseId', 'game.seasonNumber'],
    notes: 'Schedule rows are stored globally but every franchise schedule row must be tagged by franchiseId.',
  },
  {
    store: 'seasonMetadata',
    databaseName: 'kbl-tracker',
    scope: 'global-season-scoped',
    requiredKeys: ['seasonId'],
    notes: 'Franchise seasons use seasonId format {franchiseId}-season-{seasonNumber}.',
  },
  {
    store: 'franchiseSeasonSummaries',
    databaseName: 'kbl-tracker',
    scope: 'global-season-scoped',
    requiredKeys: ['seasonId', 'franchiseId', 'seasonNumber'],
    notes: 'Durable copy-not-reference Mode 2 season handoff snapshots keyed by canonical franchise seasonId.',
  },
  {
    store: 'currentGame/completedGames',
    databaseName: 'kbl-tracker',
    scope: 'global-franchise-scoped',
    requiredKeys: ['gameId', 'franchiseId', 'scheduleGameId'],
    notes: 'GameTracker snapshots and completed archives preserve the franchise and source schedule game when launched from franchise mode.',
  },
  {
    store: 'leagueTemplates/teams/players',
    databaseName: 'kbl-league-builder',
    scope: 'global-template',
    requiredKeys: ['leagueId'],
    notes: 'League Builder remains the source template; franchise setup copies selected league data into the franchise DB.',
  },
];
