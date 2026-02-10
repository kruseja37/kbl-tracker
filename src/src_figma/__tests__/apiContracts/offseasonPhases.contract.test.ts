/**
 * Offseason Phases API Contract Tests
 * Phase B - Tier 1.2 (MAJ-B5-014)
 *
 * Verify offseason phase system matches OFFSEASON_SYSTEM_SPEC.md §2:
 * 11 phases in strict order.
 */

import { describe, test, expect } from 'vitest';
import {
  OFFSEASON_PHASES,
  getPhaseDisplayName,
  isPhaseComplete,
  canAdvancePhase,
  type OffseasonPhase,
  type OffseasonState,
} from '../../../utils/offseasonStorage';

import {
  OFFSEASON_PHASES as HOOK_PHASES,
  TOTAL_PHASES,
  PHASE_NAMES,
} from '../../../hooks/useOffseasonPhase';

// ============================================
// SPEC ALIGNMENT: 11 PHASES
// ============================================

describe('Offseason Phases Contract (OFFSEASON_SYSTEM_SPEC.md §2)', () => {
  describe('offseasonStorage.ts - Phase List', () => {
    test('has exactly 11 phases', () => {
      expect(OFFSEASON_PHASES.length).toBe(11);
    });

    test('phases are in spec-mandated order', () => {
      expect(OFFSEASON_PHASES).toEqual([
        'STANDINGS_FINAL',
        'AWARDS',
        'RATINGS_ADJUSTMENTS',
        'CONTRACTION_EXPANSION',
        'RETIREMENTS',
        'FREE_AGENCY',
        'DRAFT',
        'FARM_RECONCILIATION',
        'CHEMISTRY_REBALANCING',
        'TRADES',
        'SPRING_TRAINING',
      ]);
    });

    test('FARM_RECONCILIATION is phase 8 (index 7)', () => {
      expect(OFFSEASON_PHASES[7]).toBe('FARM_RECONCILIATION');
    });

    test('CHEMISTRY_REBALANCING is phase 9 (index 8)', () => {
      expect(OFFSEASON_PHASES[8]).toBe('CHEMISTRY_REBALANCING');
    });

    test('TRADES is phase 10 (index 9), not phase 8', () => {
      expect(OFFSEASON_PHASES[9]).toBe('TRADES');
    });
  });

  describe('offseasonStorage.ts - Phase Display Names', () => {
    test('all 11 phases have display names', () => {
      for (const phase of OFFSEASON_PHASES) {
        const name = getPhaseDisplayName(phase);
        expect(name).toBeTruthy();
        expect(name).not.toBe(phase); // Should be human-readable, not the enum key
      }
    });

    test('FARM_RECONCILIATION displays as "Farm System Reconciliation"', () => {
      expect(getPhaseDisplayName('FARM_RECONCILIATION')).toBe('Farm System Reconciliation');
    });

    test('CHEMISTRY_REBALANCING displays as "Chemistry Rebalancing"', () => {
      expect(getPhaseDisplayName('CHEMISTRY_REBALANCING')).toBe('Chemistry Rebalancing');
    });
  });

  describe('offseasonStorage.ts - Phase State Logic', () => {
    test('isPhaseComplete returns true for completed phases', () => {
      const state: OffseasonState = {
        id: 'test',
        seasonId: 'test-season',
        seasonNumber: 1,
        currentPhase: 'AWARDS',
        phasesCompleted: ['STANDINGS_FINAL'],
        status: 'IN_PROGRESS',
        startedAt: Date.now(),
      };
      expect(isPhaseComplete(state, 'STANDINGS_FINAL')).toBe(true);
      expect(isPhaseComplete(state, 'AWARDS')).toBe(false);
    });

    test('canAdvancePhase returns true when current phase is completed', () => {
      const state: OffseasonState = {
        id: 'test',
        seasonId: 'test-season',
        seasonNumber: 1,
        currentPhase: 'AWARDS',
        phasesCompleted: ['STANDINGS_FINAL', 'AWARDS'],
        status: 'IN_PROGRESS',
        startedAt: Date.now(),
      };
      expect(canAdvancePhase(state)).toBe(true);
    });

    test('canAdvancePhase returns false when current phase is not completed', () => {
      const state: OffseasonState = {
        id: 'test',
        seasonId: 'test-season',
        seasonNumber: 1,
        currentPhase: 'AWARDS',
        phasesCompleted: ['STANDINGS_FINAL'],
        status: 'IN_PROGRESS',
        startedAt: Date.now(),
      };
      expect(canAdvancePhase(state)).toBe(false);
    });
  });

  // ============================================
  // HOOK ALIGNMENT
  // ============================================

  describe('useOffseasonPhase.ts - Phase Alignment', () => {
    test('TOTAL_PHASES is 11', () => {
      expect(TOTAL_PHASES).toBe(11);
    });

    test('hook phases match storage phases in count', () => {
      expect(Object.keys(HOOK_PHASES).length).toBe(11);
    });

    test('hook phases are numbered 1-11 matching spec order', () => {
      expect(HOOK_PHASES.STANDINGS_FINAL).toBe(1);
      expect(HOOK_PHASES.AWARDS).toBe(2);
      expect(HOOK_PHASES.RATINGS_ADJUSTMENTS).toBe(3);
      expect(HOOK_PHASES.CONTRACTION_EXPANSION).toBe(4);
      expect(HOOK_PHASES.RETIREMENTS).toBe(5);
      expect(HOOK_PHASES.FREE_AGENCY).toBe(6);
      expect(HOOK_PHASES.DRAFT).toBe(7);
      expect(HOOK_PHASES.FARM_RECONCILIATION).toBe(8);
      expect(HOOK_PHASES.CHEMISTRY_REBALANCING).toBe(9);
      expect(HOOK_PHASES.TRADES).toBe(10);
      expect(HOOK_PHASES.SPRING_TRAINING).toBe(11);
    });

    test('all 11 phases have display names', () => {
      for (let i = 1; i <= 11; i++) {
        expect(PHASE_NAMES[i]).toBeTruthy();
      }
    });

    test('phase names match between hook and storage', () => {
      // Map hook phase numbers to storage phase names
      const hookPhaseOrder = Object.entries(HOOK_PHASES)
        .sort(([, a], [, b]) => a - b)
        .map(([key]) => key);

      // Both should have the same keys in the same order
      expect(hookPhaseOrder).toEqual(OFFSEASON_PHASES.map(p => p));
    });
  });

  // ============================================
  // NO LEGACY PHASES REMAIN
  // ============================================

  describe('Legacy Phase Cleanup', () => {
    test('FARM_TRANSACTIONS is not in phase list (replaced by FARM_RECONCILIATION)', () => {
      expect(OFFSEASON_PHASES).not.toContain('FARM_TRANSACTIONS');
    });

    test('old 3-phase FA split (FA_PROTECTION, FREE_AGENCY_1/2/3) is not present', () => {
      const hookKeys = Object.keys(HOOK_PHASES);
      expect(hookKeys).not.toContain('FA_PROTECTION');
      expect(hookKeys).not.toContain('FREE_AGENCY_1');
      expect(hookKeys).not.toContain('FREE_AGENCY_2');
      expect(hookKeys).not.toContain('FREE_AGENCY_3');
    });

    test('old EOS_RATINGS phase is not present (now RATINGS_ADJUSTMENTS)', () => {
      const hookKeys = Object.keys(HOOK_PHASES);
      expect(hookKeys).not.toContain('EOS_RATINGS');
    });
  });
});
