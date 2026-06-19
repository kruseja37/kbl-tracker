/**
 * Unified Database Initializer for kbl-tracker
 *
 * All stores for game, season, and career data live in a single
 * IndexedDB database ('kbl-tracker').  Previously three separate files
 * (gameStorage, seasonStorage, careerStorage) each opened the DB at
 * different version numbers with different onupgradeneeded handlers.
 * When an earlier version was already open, a later version's upgrade
 * request would block forever — causing processCompletedGame to hang.
 *
 * This module provides a SINGLE init function and dbInstance cache so
 * that only one connection is ever opened, at the correct version,
 * with ALL stores created in the onupgradeneeded handler.
 */

const DB_NAME = 'kbl-tracker';
export const TRACKER_DB_VERSION = 24; // Must be the highest version any consumer ever used

let dbInstance: IDBDatabase | null = null;

/**
 * Get (or create) the shared kbl-tracker database connection.
 * Safe to call from any storage module — only one open() ever runs.
 */
export async function getTrackerDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, TRACKER_DB_VERSION);

    request.onerror = () => {
      console.error('[trackerDb] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.error('[trackerDb] Database upgrade blocked — close other tabs');
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // ── Phase 2: Game stores ──────────────────────────────────
      if (!db.objectStoreNames.contains('currentGame')) {
        db.createObjectStore('currentGame', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('completedGames')) {
        const completedStore = db.createObjectStore('completedGames', { keyPath: 'gameId' });
        completedStore.createIndex('date', 'date', { unique: false });
        completedStore.createIndex('seasonId', 'seasonId', { unique: false });
      }

      if (!db.objectStoreNames.contains('playerGameStats')) {
        const playerStore = db.createObjectStore('playerGameStats', { keyPath: ['gameId', 'playerId'] });
        playerStore.createIndex('playerId', 'playerId', { unique: false });
        playerStore.createIndex('gameId', 'gameId', { unique: false });
      }

      if (!db.objectStoreNames.contains('pitcherGameStats')) {
        const pitcherStore = db.createObjectStore('pitcherGameStats', { keyPath: ['gameId', 'pitcherId'] });
        pitcherStore.createIndex('pitcherId', 'pitcherId', { unique: false });
        pitcherStore.createIndex('gameId', 'gameId', { unique: false });
      }

      // ── Phase 3: Season stores ────────────────────────────────
      if (!db.objectStoreNames.contains('playerSeasonBatting')) {
        const battingStore = db.createObjectStore('playerSeasonBatting', {
          keyPath: ['seasonId', 'playerId'],
        });
        battingStore.createIndex('playerId', 'playerId', { unique: false });
        battingStore.createIndex('seasonId', 'seasonId', { unique: false });
        battingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains('playerSeasonPitching')) {
        const pitchingStore = db.createObjectStore('playerSeasonPitching', {
          keyPath: ['seasonId', 'playerId'],
        });
        pitchingStore.createIndex('playerId', 'playerId', { unique: false });
        pitchingStore.createIndex('seasonId', 'seasonId', { unique: false });
        pitchingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains('playerSeasonFielding')) {
        const fieldingStore = db.createObjectStore('playerSeasonFielding', {
          keyPath: ['seasonId', 'playerId'],
        });
        fieldingStore.createIndex('playerId', 'playerId', { unique: false });
        fieldingStore.createIndex('seasonId', 'seasonId', { unique: false });
      }

      if (!db.objectStoreNames.contains('seasonMetadata')) {
        const metaStore = db.createObjectStore('seasonMetadata', { keyPath: 'seasonId' });
        metaStore.createIndex('status', 'status', { unique: false });
      }

      // v12: Durable franchise season summaries for Mode 2 -> Mode 3 handoff
      if (!db.objectStoreNames.contains('franchiseSeasonSummaries')) {
        const summaryStore = db.createObjectStore('franchiseSeasonSummaries', {
          keyPath: 'seasonId',
        });
        summaryStore.createIndex('franchiseId', 'franchiseId', { unique: false });
        summaryStore.createIndex('seasonNumber', 'seasonNumber', { unique: false });
        summaryStore.createIndex('franchiseId_seasonNumber', ['franchiseId', 'seasonNumber'], {
          unique: true,
        });
      }

      // v13 / TV1-FIX R-7: True Value rows live in the shared DB. No migration
      // from the pre-release standalone DB; rows regenerate on completed games.
      if (!db.objectStoreNames.contains('franchiseTrueValueRows')) {
        const trueValueStore = db.createObjectStore('franchiseTrueValueRows', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
        trueValueStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        trueValueStore.createIndex('by_player_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], {
          unique: true,
        });
      }

      // v14 / TV2 R-7 + MODE_2_CANON §17: projected designation rows live in
      // the shared DB. Player-embedded pre-release designation fields are not
      // migrated; rows recalculate after completed games.
      if (!db.objectStoreNames.contains('franchiseDesignationRows')) {
        const designationStore = db.createObjectStore('franchiseDesignationRows', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'teamId', 'type'],
        });
        designationStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        designationStore.createIndex('by_team_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'teamId'], {
          unique: false,
        });
        designationStore.createIndex('by_player_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], {
          unique: false,
        });
      }

      // ── Phase 5: Career stores ────────────────────────────────
      if (!db.objectStoreNames.contains('playerCareerBatting')) {
        const careerBattingStore = db.createObjectStore('playerCareerBatting', {
          keyPath: 'playerId',
        });
        careerBattingStore.createIndex('teamId', 'teamId', { unique: false });
        careerBattingStore.createIndex('homeRuns', 'homeRuns', { unique: false });
        careerBattingStore.createIndex('hits', 'hits', { unique: false });
      }

      if (!db.objectStoreNames.contains('playerCareerPitching')) {
        const careerPitchingStore = db.createObjectStore('playerCareerPitching', {
          keyPath: 'playerId',
        });
        careerPitchingStore.createIndex('teamId', 'teamId', { unique: false });
        careerPitchingStore.createIndex('wins', 'wins', { unique: false });
        careerPitchingStore.createIndex('strikeouts', 'strikeouts', { unique: false });
      }

      if (!db.objectStoreNames.contains('playerCareerFielding')) {
        const careerFieldingStore = db.createObjectStore('playerCareerFielding', {
          keyPath: 'playerId',
        });
        careerFieldingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains('careerMilestones')) {
        const milestoneStore = db.createObjectStore('careerMilestones', {
          keyPath: 'id',
        });
        milestoneStore.createIndex('playerId', 'playerId', { unique: false });
        milestoneStore.createIndex('milestoneType', 'milestoneType', { unique: false });
        milestoneStore.createIndex('achievedDate', 'achievedDate', { unique: false });
      }

      // ── v4: Elimination Mode stores ─────────────────────────────

      // Roster snapshots — frozen rosters for Elimination brackets
      if (!db.objectStoreNames.contains('rosterSnapshots')) {
        const snapshotStore = db.createObjectStore('rosterSnapshots', { keyPath: 'key' });
        snapshotStore.createIndex('eliminationId', 'eliminationId', { unique: false });
        snapshotStore.createIndex('teamId', 'teamId', { unique: false });
      }

      // Mojo/Fitness snapshots — persist between Elimination bracket games
      if (!db.objectStoreNames.contains('mojoFitnessSnapshots')) {
        const mojoStore = db.createObjectStore('mojoFitnessSnapshots', {
          keyPath: ['eliminationId', 'playerId'],
        });
        mojoStore.createIndex('eliminationId', 'eliminationId', { unique: false });
      }

      // ── v5: Almanac canonical registry ──────────────────────────
      if (!db.objectStoreNames.contains('almanacCanonicalPlayers')) {
        const canonicalStore = db.createObjectStore('almanacCanonicalPlayers', {
          keyPath: 'canonicalId',
        });
        canonicalStore.createIndex('playerName', 'playerName', { unique: false });
      }

      // ── v6: Elimination run Fame aggregates ─────────────────────
      if (!db.objectStoreNames.contains('eliminationRunFameAggregates')) {
        db.createObjectStore('eliminationRunFameAggregates', { keyPath: 'runId' });
      }

      // ── v11: Elimination all-time stat aggregates ──────────────
      if (!db.objectStoreNames.contains('eliminationAllTimePlayerStats')) {
        db.createObjectStore('eliminationAllTimePlayerStats', { keyPath: 'playerId' });
      }

      // ── v7: Reporter almanac cache substrate ───────────────────
      if (!db.objectStoreNames.contains('reporterPlayerAlmanacCaches')) {
        const playerCacheStore = db.createObjectStore('reporterPlayerAlmanacCaches', {
          keyPath: 'cacheKey',
        });
        playerCacheStore.createIndex('playerId', 'playerId', { unique: false });
        playerCacheStore.createIndex('instanceId', 'instanceId', { unique: false });
      }

      if (!db.objectStoreNames.contains('reporterTeamAlmanacCaches')) {
        const teamCacheStore = db.createObjectStore('reporterTeamAlmanacCaches', {
          keyPath: 'cacheKey',
        });
        teamCacheStore.createIndex('teamId', 'teamId', { unique: false });
        teamCacheStore.createIndex('instanceId', 'instanceId', { unique: false });
      }

      if (!db.objectStoreNames.contains('reporterAlmanacEntries')) {
        const entryStore = db.createObjectStore('reporterAlmanacEntries', {
          keyPath: 'id',
        });
        entryStore.createIndex('entityKey', 'entityKey', { unique: false });
        entryStore.createIndex('entityType', 'entityType', { unique: false });
        entryStore.createIndex('entityId', 'entityId', { unique: false });
        entryStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('reporterLegacySummaryJobs')) {
        const jobStore = db.createObjectStore('reporterLegacySummaryJobs', {
          keyPath: 'id',
        });
        jobStore.createIndex('status', 'status', { unique: false });
        jobStore.createIndex('entityKey', 'entityKey', { unique: false });
        jobStore.createIndex('queuedAt', 'queuedAt', { unique: false });
      }

      // ── v8: Reporter LLM usage + app preferences ───────────────
      if (!db.objectStoreNames.contains('llmUsageLog')) {
        const usageStore = db.createObjectStore('llmUsageLog', { keyPath: 'id' });
        usageStore.createIndex('timestamp', 'timestamp', { unique: false });
        usageStore.createIndex('gameId', 'gameId', { unique: false });
        usageStore.createIndex('mode', 'mode', { unique: false });
        usageStore.createIndex('intensity', 'intensity', { unique: false });
        usageStore.createIndex('model', 'model', { unique: false });
        usageStore.createIndex('purpose', 'purpose', { unique: false });
      }

      if (!db.objectStoreNames.contains('userPreferences')) {
        db.createObjectStore('userPreferences', { keyPath: 'key' });
      }

      // ── v9: Reporter Voice stores ─────────────────────────────
      if (!db.objectStoreNames.contains('reporters')) {
        const reporterStore = db.createObjectStore('reporters', { keyPath: 'id' });
        reporterStore.createIndex('teamId', 'teamId', { unique: false });
        reporterStore.createIndex('leagueId', 'leagueId', { unique: false });
        reporterStore.createIndex('changed_at', 'changed_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('gameStories')) {
        const storyStore = db.createObjectStore('gameStories', { keyPath: 'id' });
        storyStore.createIndex('gameId', 'gameId', { unique: false });
        storyStore.createIndex('reporterId', 'reporterId', { unique: false });
        storyStore.createIndex('teamId', 'teamId', { unique: false });
        storyStore.createIndex('leagueId', 'leagueId', { unique: false });
        storyStore.createIndex('opponentTeamId', 'opponentTeamId', { unique: false });
        storyStore.createIndex('gameMode', 'gameMode', { unique: false });
        storyStore.createIndex('gameDate', 'gameDate', { unique: false });
        storyStore.createIndex('changed_at', 'changed_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('narrativeContext')) {
        const contextStore = db.createObjectStore('narrativeContext', { keyPath: 'id' });
        contextStore.createIndex('teamId', 'teamId', { unique: false });
        contextStore.createIndex('leagueId', 'leagueId', { unique: false });
        contextStore.createIndex('gameMode', 'gameMode', { unique: false });
        contextStore.createIndex('teamId_gameMode', ['teamId', 'gameMode'], { unique: false });
        contextStore.createIndex('changed_at', 'changed_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('rivalryScores')) {
        const rivalryStore = db.createObjectStore('rivalryScores', { keyPath: 'id' });
        rivalryStore.createIndex('teamId', 'teamId', { unique: false });
        rivalryStore.createIndex('leagueId', 'leagueId', { unique: false });
        rivalryStore.createIndex('rivalTeamId', 'rivalTeamId', { unique: false });
        rivalryStore.createIndex('teamId_rivalTeamId', ['teamId', 'rivalTeamId'], { unique: false });
        rivalryStore.createIndex('changed_at', 'changed_at', { unique: false });
      }

      // ── v10: In-game commentary feed persistence ─────────────
      if (!db.objectStoreNames.contains('commentaryFeedEntries')) {
        const commentaryStore = db.createObjectStore('commentaryFeedEntries', {
          keyPath: 'id',
        });
        commentaryStore.createIndex('gameId', 'gameId', { unique: false });
        commentaryStore.createIndex('reporterId', 'reporterId', { unique: false });
        commentaryStore.createIndex('leagueId', 'leagueId', { unique: false });
        commentaryStore.createIndex('timestamp', 'timestamp', { unique: false });
        commentaryStore.createIndex('changed_at', 'changed_at', { unique: false });
        commentaryStore.createIndex('gameId_timestamp', ['gameId', 'timestamp'], {
          unique: false,
        });
      }

      // v15 / T7c R-T7c-MIGRATION + IV §8.4: season salary ledger rows live in
      // the shared DB. Rows are season-scoped; old-season rows are not migrated.
      if (!db.objectStoreNames.contains('franchiseSeasonLedgerRows')) {
        const ledgerStore = db.createObjectStore('franchiseSeasonLedgerRows', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
        ledgerStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }

      // v16 / L4a SEA-1..5: season-long publish-bus foundation. News items
      // are stored separately from relationship/rivalry edge state.
      if (!db.objectStoreNames.contains('seasonNewsItems')) {
        const seasonNewsStore = db.createObjectStore('seasonNewsItems', {
          keyPath: ['franchiseId', 'seasonId', 'id'],
        });
        seasonNewsStore.createIndex('by_scope', ['franchiseId', 'seasonId'], {
          unique: false,
        });
        seasonNewsStore.createIndex('by_event', ['franchiseId', 'seasonId', 'eventType'], {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains('seasonEmissionConfig')) {
        db.createObjectStore('seasonEmissionConfig', { keyPath: 'id' });
      }

      // v17 / D6a: live trusted-value artifact per franchise/season/stats
      // scope. D6b freezes the same artifact at season end.
      if (!db.objectStoreNames.contains('franchiseTrustedValueArtifacts')) {
        db.createObjectStore('franchiseTrustedValueArtifacts', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId'],
        });
      }

      // v18 / D9a: dark awards spine rows. D9b/D9c populate winners later;
      // D9a only creates the persistence shape and backup/sync parity.
      if (!db.objectStoreNames.contains('franchiseAwardsRows')) {
        const awardsStore = db.createObjectStore('franchiseAwardsRows', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'category'],
        });
        awardsStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }

      // v18 / D9a + LSD-1 SEAM-4: per-game True Value trough snapshots.
      if (!db.objectStoreNames.contains('franchiseTrueValueSnapshots')) {
        const trueValueSnapshotStore = db.createObjectStore('franchiseTrueValueSnapshots', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId', 'checkpoint'],
        });
        trueValueSnapshotStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }

      // v19 / L6b-1: dark fame running-state records. L6b-2 wires writers.
      if (!db.objectStoreNames.contains('franchiseFameRecords')) {
        const fameStore = db.createObjectStore('franchiseFameRecords', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
        fameStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }

      // v20 / L5b: dark flashpoint-decay running-state accumulator (§13 tooth #2).
      // Seam-neutral until L7/L10/L13; the per-game compute is gated OFF by default.
      if (!db.objectStoreNames.contains('franchiseFlashpointDecay')) {
        const flashpointStore = db.createObjectStore('franchiseFlashpointDecay', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
        flashpointStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }

      // v21 / L2a: dark franchise-instance ratings overlay store (§11 / L2).
      // Writers, read-path merge, confirmation transitions, and expiry are later tickets.
      if (!db.objectStoreNames.contains('franchiseRatingsOverlays')) {
        const ratingsOverlayStore = db.createObjectStore('franchiseRatingsOverlays', {
          keyPath: 'id',
        });
        ratingsOverlayStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        ratingsOverlayStore.createIndex('by_player', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], {
          unique: false,
        });
      }

      // v22 / L9b-3b-i: dark franchise-instance trait overlay store (§11 / L9b).
      // Writers, readers, confirmation, and player-record application are later tickets.
      if (!db.objectStoreNames.contains('franchiseTraitOverlays')) {
        const traitOverlayStore = db.createObjectStore('franchiseTraitOverlays', {
          keyPath: 'id',
        });
        traitOverlayStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        traitOverlayStore.createIndex('by_player', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], {
          unique: false,
        });
      }

      // v23 / L10-2: dark franchise-instance L10 random-event overlay store (§16 / L10).
      // No production writer/reader yet; L10-3 wires the dark hook later.
      if (!db.objectStoreNames.contains('franchiseL10Overlays')) {
        const l10OverlayStore = db.createObjectStore('franchiseL10Overlays', {
          keyPath: 'id',
        });
        l10OverlayStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        l10OverlayStore.createIndex('by_target', ['franchiseId', 'seasonId', 'statsScopeId', 'targetId'], {
          unique: false,
        });
      }

      // v24 / L12-1: dark franchise-instance All-Star roster store (§21 / L12).
      // No production writer/reader yet; L12-4/L12-5 wire the dark roster flow later.
      if (!db.objectStoreNames.contains('franchiseAllStarRosters')) {
        const allStarRosterStore = db.createObjectStore('franchiseAllStarRosters', {
          keyPath: 'id',
        });
        allStarRosterStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }
    };
  });
}

export const openTrackerDb = getTrackerDb;

export function resetTrackerDbForTests(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
