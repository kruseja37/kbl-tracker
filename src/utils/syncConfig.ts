/**
 * Sync Configuration Registry
 *
 * Declarative mapping of which IndexedDB databases/stores and localStorage keys
 * are synced to Supabase. Each entry maps a store name to its IDB keyPath.
 */

// Static databases with known stores
export const SYNC_REGISTRY: Record<string, Record<string, string | string[]>> = {
  'kbl-tracker': {
    completedGames: 'gameId',
    // playerGameStats and pitcherGameStats NOT synced — stores exist in schema
    // but are never written to. Stats are embedded in completedGames records.
    almanacCanonicalPlayers: 'canonicalId',
    careerMilestones: 'id',
    commentaryFeedEntries: 'id',
    eliminationAllTimePlayerStats: 'playerId',
    eliminationRunFameAggregates: 'runId',
    gameStories: 'id',
    llmUsageLog: 'id',
    mojoFitnessSnapshots: ['eliminationId', 'playerId'],
    narrativeContext: 'id',
    playerCareerBatting: 'playerId',
    playerCareerFielding: 'playerId',
    playerCareerPitching: 'playerId',
    playerSeasonBatting: ['seasonId', 'playerId'],
    playerSeasonFielding: ['seasonId', 'playerId'],
    playerSeasonPitching: ['seasonId', 'playerId'],
    reporters: 'id',
    reporterPlayerAlmanacCaches: 'cacheKey',
    reporterTeamAlmanacCaches: 'cacheKey',
    reporterAlmanacEntries: 'id',
    reporterLegacySummaryJobs: 'id',
    rivalryScores: 'id',
    rosterSnapshots: 'key',
    seasonMetadata: 'seasonId',
    userPreferences: 'key',
  },
  'kbl-league-builder': {
    leagueTemplates: 'id',
    globalTeams: 'id',
    globalPlayers: 'id',
    leaguePlayerOverrides: 'id',
    rulesPresets: 'id',
    teamRosters: 'teamId',
  },
  'kbl-schedule': {
    scheduledGames: 'id',
    scheduleMetadata: 'seasonNumber',
  },
  'kbl-app-meta': {
    franchiseList: 'franchiseId',
    // appSettings excluded — stores 'activeFranchise' which is device-specific
    franchiseConfigs: 'franchiseId',
    eliminationList: 'eliminationId',
  },
  'kbl-playoffs': {
    playoffs: 'id',
    series: 'id',
    // playoffGames excluded — store exists in schema but is never written to
    playoffStats: 'id',
  },
};

// Dynamic per-franchise DBs — discovered via kbl-app-meta.franchiseList
export const DYNAMIC_DB_PREFIX = 'kbl-franchise-';
export const DYNAMIC_DB_STORES: Record<string, string> = {
  players: 'id',
  teams: 'id',
};

// Dynamic per-elimination copied DBs — discovered via kbl-app-meta.eliminationList
export const DYNAMIC_ELIMINATION_DB_PREFIX = 'kbl-elimination-';
export const DYNAMIC_ELIMINATION_DB_STORES: Record<string, string> = {
  players: 'id',
  teams: 'id',
};

// localStorage keys to sync (via kbl_local_storage table)
export const SYNCED_LOCAL_STORAGE_KEYS = [
  'kbl-leagues',           // LeagueConfig[] from leagueStorage.ts
  'kbl-season-dh-config',  // SeasonDHConfig from leagueConfig.ts
  'kbl-league-dh-config',  // LeagueData[] from leagueConfig.ts (migrated key)
];

/**
 * Serialize an IDB key (simple or composite) to a string for use as record_key in Supabase.
 */
export function serializeKey(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Deserialize a record_key string back to the original IDB key value.
 */
export function deserializeKey(s: string): unknown {
  return JSON.parse(s);
}

/**
 * Extract the key value from a record given its keyPath definition.
 */
export function extractKey(record: Record<string, unknown>, keyPath: string | string[]): unknown {
  if (Array.isArray(keyPath)) {
    return keyPath.map(k => record[k]);
  }
  return record[keyPath];
}
