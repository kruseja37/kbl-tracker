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
const DB_VERSION = 3; // Must be the highest version any consumer ever used

let dbInstance: IDBDatabase | null = null;

/**
 * Get (or create) the shared kbl-tracker database connection.
 * Safe to call from any storage module — only one open() ever runs.
 */
export async function getTrackerDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
    };
  });
}
