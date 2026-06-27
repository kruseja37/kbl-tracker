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
    franchiseSeasonSummaries: 'seasonId',
    franchiseTrustedValueArtifacts: ['franchiseId', 'seasonId', 'statsScopeId'],
    franchiseAwardsRows: ['franchiseId', 'seasonId', 'statsScopeId', 'category'],
    franchiseFameRecords: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
    franchiseFlashpointDecay: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
    franchiseRatingsOverlays: 'id',
    franchiseRelationshipEdges: 'id',
    franchiseTradeDemandState: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
    franchiseL10Overlays: 'id',
    franchiseTraitOverlays: 'id',
    franchiseAllStarRosters: 'id',
    franchiseTrueValueSnapshots: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId', 'checkpoint'],
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
    seasonEmissionConfig: 'id',
    seasonMetadata: 'seasonId',
    seasonNewsItems: ['franchiseId', 'seasonId', 'id'],
    userPreferences: 'key',
  },
  'kbl-league-builder': {
    leagueTemplates: 'id',
    globalTeams: 'id',
    globalPlayers: 'id',
    leaguePlayerOverrides: 'id',
    rulesPresets: 'id',
    teamRosters: 'teamId',
    registeredPools: 'leagueId',
    mlbDraftSessions: 'id',
    auctionSessions: 'id',
  },
  'kbl-event-log': {
    gameHeaders: 'gameId',
    atBatEvents: 'eventId',
    pitchingAppearances: 'appearanceId',
    fieldingEvents: 'fieldingEventId',
    betweenPlayEvents: 'eventId',
  },
  'kbl-manager-identity': {
    managerProfiles: 'managerId',
    managerAssignments: ['mode', 'instanceId', 'teamId'],
  },
  'kbl-player-data': {
    playerRatings: 'playerId',
    players: 'id',
  },
  'kbl-manager': {
    managerProfiles: 'id',
    managerDecisions: 'decisionId',
    managerSeasonStats: ['seasonId', 'managerId'],
  },
  'kbl-relationships': {
    relationships: 'relationshipId',
  },
  'kbl-museum': {
    championships: 'year',
    seasonStandings: ['year', 'teamId'],
    teamRecords: 'teamId',
    awardWinners: ['year', 'awardType'],
    hallOfFame: 'id',
    allTimeLeaders: 'id',
    records: 'id',
    moments: 'id',
    retiredJerseys: 'id',
    stadiums: 'id',
  },
  'kbl-offseason': {
    offseasonState: 'id',
    awards: 'id',
    ratings: 'id',
    retirements: 'id',
    freeAgency: 'id',
    draft: 'id',
    trades: 'id',
  },
  'kbl-farm': {
    farmPlayers: 'playerId',
  },
  'kbl-franchise-farm': {
    franchiseFarmRecords: 'id',
  },
  'kbl-franchise-random-events': {
    randomEventEntries: 'id',
  },
  'kbl-franchise-morale': {
    moraleSnapshots: 'id',
  },
  'kbl-franchise-expected-wins-baselines': {
    expectedWinsBaselineSnapshots: 'id',
  },
  'kbl-franchise-morale-daily-snapshots': {
    moraleDailySnapshots: 'id',
  },
  'kbl-franchise-stadium-records': {
    stadiumRecords: 'id',
  },
  'kbl-franchise-home-park-rivals': {
    homeParkRivals: 'id',
  },
  'kbl-transactions': {
    transactions: 'id',
  },
  'kbl-adaptive-standards': {
    engineState: 'id',
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
  'kbl-franchise-transition-journal': {
    transitionJournals: 'id',
  },
  'kbl-playoffs': {
    playoffs: 'id',
    series: 'id',
    playoffGames: 'id',
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
  'kbl-app-state',         // App preferences and selected team/season
  'kbl-current-season',    // Current franchise/season number
  'kbl_last_transition',   // Last completed season transition marker
  'kbl_years_of_service',
  'kbl-player-ratings',    // Legacy manual ratings override store
  'kbl-custom-players',    // Legacy custom player store
  'kbl_h2h_records',       // Legacy head-to-head records
  'kbl_adaptive_learning_zones',
  'kbl_adaptive_learning_players',
  'kbl_adaptive_learning_events',
];

export const SYNCED_LOCAL_STORAGE_PREFIXES = [
  'kbl-fan-morale-',
  'kbl_season_',
  'kbl_rookie_',
  'kbl-season_',
];

export function shouldSyncLocalStorageKey(key: string): boolean {
  return (
    SYNCED_LOCAL_STORAGE_KEYS.includes(key) ||
    SYNCED_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

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
