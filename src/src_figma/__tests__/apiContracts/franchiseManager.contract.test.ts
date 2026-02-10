/**
 * Franchise Manager API Contract Tests
 * Phase B - Tier 1.2
 *
 * Verify franchiseManager exports exist at correct paths and return expected types.
 * Tests pure functions directly; IndexedDB-dependent functions verified via type checking.
 */

import { describe, test, expect } from 'vitest';
import {
  // Functions
  getFranchiseDBName,
  initMetaDatabase,
  createFranchise,
  loadFranchise,
  deleteFranchise,
  renameFranchise,
  listFranchises,
  getActiveFranchise,
  setActiveFranchise,
  exportFranchise,
  importFranchise,
  estimateStorageUsage,
  switchFranchise,
  getActiveFranchiseDb,
  getActiveFranchiseIdSync,
  hasLegacyData,
  migrateLegacyData,
  resetMetaDb,

  // Types
  type FranchiseId,
  type FranchiseMetadata,
  type FranchiseSummary,
  type FranchiseStats,
  type SeasonSummary,
  type AppSettings,
} from '../../../utils/franchiseManager';

// ============================================
// EXPORT CONTRACT
// ============================================

describe('Franchise Manager API Contract', () => {
  describe('Export Contract — all functions are exported', () => {
    test('getFranchiseDBName is a function', () => {
      expect(typeof getFranchiseDBName).toBe('function');
    });

    test('initMetaDatabase is a function', () => {
      expect(typeof initMetaDatabase).toBe('function');
    });

    test('CRUD functions are exported', () => {
      expect(typeof createFranchise).toBe('function');
      expect(typeof loadFranchise).toBe('function');
      expect(typeof deleteFranchise).toBe('function');
      expect(typeof renameFranchise).toBe('function');
      expect(typeof listFranchises).toBe('function');
    });

    test('Active franchise functions are exported', () => {
      expect(typeof getActiveFranchise).toBe('function');
      expect(typeof setActiveFranchise).toBe('function');
      expect(typeof getActiveFranchiseDb).toBe('function');
      expect(typeof getActiveFranchiseIdSync).toBe('function');
    });

    test('Export/Import functions are exported', () => {
      expect(typeof exportFranchise).toBe('function');
      expect(typeof importFranchise).toBe('function');
    });

    test('Storage monitoring is exported', () => {
      expect(typeof estimateStorageUsage).toBe('function');
    });

    test('Switching function is exported', () => {
      expect(typeof switchFranchise).toBe('function');
    });

    test('Migration functions are exported', () => {
      expect(typeof hasLegacyData).toBe('function');
      expect(typeof migrateLegacyData).toBe('function');
    });

    test('Reset function for testing is exported', () => {
      expect(typeof resetMetaDb).toBe('function');
    });
  });

  // ============================================
  // PURE FUNCTION TESTS
  // ============================================

  describe('getFranchiseDBName', () => {
    test('prefixes ID with kbl-franchise-', () => {
      expect(getFranchiseDBName('abc123')).toBe('kbl-franchise-abc123');
    });

    test('handles empty string', () => {
      expect(getFranchiseDBName('')).toBe('kbl-franchise-');
    });

    test('handles special characters', () => {
      expect(getFranchiseDBName('test-franchise-1')).toBe('kbl-franchise-test-franchise-1');
    });
  });

  describe('getActiveFranchiseIdSync', () => {
    test('returns null when no franchise is active', () => {
      resetMetaDb();
      expect(getActiveFranchiseIdSync()).toBeNull();
    });
  });

  describe('getActiveFranchiseDb', () => {
    test('returns null when no DB is open', () => {
      resetMetaDb();
      expect(getActiveFranchiseDb()).toBeNull();
    });
  });

  // ============================================
  // TYPE CONTRACT
  // ============================================

  describe('Type Contracts', () => {
    test('FranchiseMetadata has expected shape', () => {
      const meta: FranchiseMetadata = {
        franchiseId: 'test-1',
        name: 'Test Franchise',
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        schemaVersion: 1,
        appVersionCreated: '1.0.0',
      };
      expect(meta.franchiseId).toBe('test-1');
      expect(meta.schemaVersion).toBe(1);
    });

    test('FranchiseSummary has expected shape', () => {
      const summary: FranchiseSummary = {
        id: 'test-1',
        name: 'Test',
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        currentSeason: 1,
        totalSeasons: 1,
        storageUsedBytes: 0,
      };
      expect(summary.id).toBe('test-1');
      expect(summary.storageUsedBytes).toBe(0);
    });

    test('FranchiseStats has expected shape', () => {
      const stats: FranchiseStats = {
        totalGames: 0,
        totalAtBats: 0,
        totalFameEvents: 0,
        seasons: [],
      };
      expect(stats.seasons).toEqual([]);
    });

    test('SeasonSummary has expected shape', () => {
      const season: SeasonSummary = {
        seasonId: 'season-1',
        seasonNumber: 1,
        gamesPlayed: 10,
        status: 'IN_PROGRESS',
      };
      expect(season.status).toBe('IN_PROGRESS');
    });

    test('AppSettings has expected shape', () => {
      const settings: AppSettings = {
        lastUsedFranchise: null,
      };
      expect(settings.lastUsedFranchise).toBeNull();
    });

    test('FranchiseId is a string type', () => {
      const id: FranchiseId = 'some-id';
      expect(typeof id).toBe('string');
    });
  });
});
