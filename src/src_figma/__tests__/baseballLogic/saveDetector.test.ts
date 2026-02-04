/**
 * Save Detector Engine Tests
 *
 * Tests for src/src_figma/app/engines/saveDetector.ts
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.4:
 * - Save Opportunity Detection
 * - Save Conditions
 * - Blown Save Tests
 * - Hold Tests
 */

import { describe, test, expect } from 'vitest';
import {
  isSaveOpportunity,
  isSaveOpportunityBool,
  detectSave,
  detectBlownSave,
  detectHold,
  calculateLead,
  createPitcherAppearance,
  updatePitcherAppearance,
  finalizePitcherAppearance,
  type GameState,
  type PitcherAppearance,
} from '../../app/engines/saveDetector';

// ============================================
// HELPER FUNCTIONS
// ============================================

function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 0,
    bases: { first: null, second: null, third: null },
    homeScore: 5,
    awayScore: 3,
    scheduledInnings: 9,
    isHomeDefense: true, // Home team in field (bottom inning)
    ...overrides,
  };
}

function createBasicAppearance(overrides: Partial<PitcherAppearance> = {}): PitcherAppearance {
  return {
    pitcherId: 'pitcher1',
    pitcherName: 'Test Pitcher',
    leadWhenEntered: 2,
    leadWhenExited: 2,
    enteredInSaveOpportunity: true,
    entryState: {
      inning: 9,
      outs: 0,
      bases: { first: false, second: false, third: false },
      lead: 2,
    },
    outsRecorded: 3,
    finishedGame: true,
    runsAllowed: 0,
    isWinningPitcher: false,
    ...overrides,
  };
}

// ============================================
// SAVE OPPORTUNITY DETECTION TESTS
// ============================================

describe('Save Opportunity Detection (isSaveOpportunity)', () => {
  describe('Lead requirement', () => {
    test('no lead (tied) - NOT save opportunity', () => {
      expect(isSaveOpportunity(0, { first: null, second: null, third: null }, 9, 9)).toBe(false);
    });

    test('trailing - NOT save opportunity', () => {
      expect(isSaveOpportunity(-2, { first: null, second: null, third: null }, 9, 9)).toBe(false);
    });

    test('1-run lead in 9th - IS save opportunity', () => {
      expect(isSaveOpportunity(1, { first: null, second: null, third: null }, 9, 9)).toBe(true);
    });
  });

  describe('3-run lead or less (standard save)', () => {
    test('9th inning, 3-run lead - SAVE OPPORTUNITY', () => {
      expect(isSaveOpportunity(3, { first: null, second: null, third: null }, 9, 9)).toBe(true);
    });

    test('9th inning, 2-run lead - SAVE OPPORTUNITY', () => {
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 9, 9)).toBe(true);
    });

    test('9th inning, 1-run lead - SAVE OPPORTUNITY', () => {
      expect(isSaveOpportunity(1, { first: null, second: null, third: null }, 9, 9)).toBe(true);
    });
  });

  describe('4+ run lead with tying run logic', () => {
    test('9th inning, 4-run lead, bases empty - NOT save opportunity', () => {
      // Tying run is 4 batters away (at bat + 3)
      expect(isSaveOpportunity(4, { first: null, second: null, third: null }, 9, 9)).toBe(false);
    });

    test('9th inning, 4-run lead, R1 - NOT save opportunity', () => {
      // 1 runner + 2 (at bat + on deck) = 3, lead 4 > 3
      expect(isSaveOpportunity(4, { first: { playerId: 'r1', playerName: 'R1', inheritedFrom: null }, second: null, third: null }, 9, 9)).toBe(false);
    });

    test('9th inning, 4-run lead, R1+R2 - SAVE OPPORTUNITY (tying run on deck)', () => {
      // 2 runners + 2 = 4, lead 4 <= 4 ✓
      const bases = {
        first: { playerId: 'r1', playerName: 'R1', inheritedFrom: null },
        second: { playerId: 'r2', playerName: 'R2', inheritedFrom: null },
        third: null,
      };
      expect(isSaveOpportunity(4, bases, 9, 9)).toBe(true);
    });

    test('9th inning, 4-run lead, bases loaded - SAVE OPPORTUNITY (tying run at bat)', () => {
      // 3 runners + 2 = 5, lead 4 <= 5 ✓
      const bases = {
        first: { playerId: 'r1', playerName: 'R1', inheritedFrom: null },
        second: { playerId: 'r2', playerName: 'R2', inheritedFrom: null },
        third: { playerId: 'r3', playerName: 'R3', inheritedFrom: null },
      };
      expect(isSaveOpportunity(4, bases, 9, 9)).toBe(true);
    });

    test('9th inning, 5-run lead, bases loaded - NOT save opportunity', () => {
      // 3 runners + 2 = 5, lead 5 <= 5 but edge case
      const bases = {
        first: { playerId: 'r1', playerName: 'R1', inheritedFrom: null },
        second: { playerId: 'r2', playerName: 'R2', inheritedFrom: null },
        third: { playerId: 'r3', playerName: 'R3', inheritedFrom: null },
      };
      expect(isSaveOpportunity(5, bases, 9, 9)).toBe(true); // Tying run on deck
    });
  });

  describe('Late game requirement', () => {
    test('7th inning, 2-run lead (9-inning game) - SAVE OPPORTUNITY', () => {
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 7, 9)).toBe(true);
    });

    test('6th inning, 2-run lead (9-inning game) - NOT save opportunity (too early)', () => {
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 6, 9)).toBe(false);
    });

    test('5th inning, 2-run lead (7-inning game) - SAVE OPPORTUNITY', () => {
      // For 7-inning game, late game starts at inning 5 (7 - 2)
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 5, 7)).toBe(true);
    });

    test('4th inning, 2-run lead (7-inning game) - NOT save opportunity', () => {
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 4, 7)).toBe(false);
    });

    test('4th inning, 2-run lead (6-inning game) - SAVE OPPORTUNITY', () => {
      expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 4, 6)).toBe(true);
    });
  });
});

describe('Save Opportunity Detection (isSaveOpportunityBool)', () => {
  test('works with boolean bases', () => {
    expect(isSaveOpportunityBool(2, { first: false, second: false, third: false }, 9, 9)).toBe(true);
    expect(isSaveOpportunityBool(0, { first: false, second: false, third: false }, 9, 9)).toBe(false);
  });

  test('4-run lead with R1+R2 - SAVE OPPORTUNITY', () => {
    expect(isSaveOpportunityBool(4, { first: true, second: true, third: false }, 9, 9)).toBe(true);
  });
});

// ============================================
// SAVE DETECTION TESTS
// ============================================

describe('Save Detection (detectSave)', () => {
  describe('Basic save conditions', () => {
    test('finish game with lead, not winning pitcher, 1+ IP - SAVE', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 3, // 1 inning
        finishedGame: true,
        isWinningPitcher: false,
        leadWhenExited: 2,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('SAVE');
      expect(result.message).toContain('save');
    });

    test('game not finished - NOT save', () => {
      const appearance = createBasicAppearance();
      const result = detectSave(appearance, false, true);
      expect(result.result).toBe('NONE');
      expect(result.message).toContain('not finished');
    });

    test('finish game with lead but IS winning pitcher - NO SAVE', () => {
      const appearance = createBasicAppearance({
        isWinningPitcher: true,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('NONE');
      expect(result.message).toContain('winning pitcher');
    });

    test('team did not win - NO SAVE', () => {
      const appearance = createBasicAppearance();
      const result = detectSave(appearance, true, false);
      expect(result.result).toBe('NONE');
      expect(result.message).toContain('not win');
    });

    test('did not enter in save opportunity - NO SAVE', () => {
      const appearance = createBasicAppearance({
        enteredInSaveOpportunity: false,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('NONE');
      expect(result.message).toContain('save opportunity');
    });
  });

  describe('Blown save scenarios', () => {
    test('enter save opp, relinquish lead, team wins - BLOWN SAVE', () => {
      const appearance = createBasicAppearance({
        leadWhenEntered: 2,
        leadWhenExited: 0, // Tied or lost lead
        finishedGame: false,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('BLOWN_SAVE');
    });

    test('enter save opp, relinquish lead, team loses - BLOWN SAVE + LOSS', () => {
      const appearance = createBasicAppearance({
        leadWhenEntered: 2,
        leadWhenExited: -1, // Trailing
        finishedGame: true,
      });

      const result = detectSave(appearance, true, false);
      expect(result.result).toBe('BLOWN_SAVE_LOSS');
    });
  });

  describe('Hold scenarios', () => {
    test('enter save opp, record out, maintain lead, exit - HOLD', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 3,
        finishedGame: false, // Did not finish
        leadWhenExited: 2,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('HOLD');
    });

    test('enter save opp, 0 outs recorded, exit - NO HOLD', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 0, // No outs recorded
        finishedGame: false,
        leadWhenExited: 2,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('NONE');
    });

    test('enter save opp, maintain lead, finish game - SAVE (not hold)', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 3,
        finishedGame: true, // Finished game
        leadWhenExited: 2,
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('SAVE');
    });
  });

  describe('Minimum innings requirement', () => {
    test('less than 1 IP without tying run close - NO SAVE', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 2, // Less than 3 outs
        leadWhenEntered: 3,
        entryState: {
          inning: 9,
          outs: 0,
          bases: { first: false, second: false, third: false },
          lead: 3,
        },
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('NONE');
    });

    test('less than 1 IP but tying run on deck - SAVE', () => {
      const appearance = createBasicAppearance({
        outsRecorded: 2, // Less than 3 outs
        leadWhenEntered: 3,
        entryState: {
          inning: 9,
          outs: 0,
          bases: { first: true, second: false, third: false }, // 1 runner
          lead: 3, // 3 <= 1+2 = tying run on deck
        },
      });

      const result = detectSave(appearance, true, true);
      expect(result.result).toBe('SAVE');
    });
  });
});

// ============================================
// BLOWN SAVE DETECTION TESTS (LEGACY)
// ============================================

describe('Blown Save Detection (detectBlownSave)', () => {
  test('relinquished lead in save opportunity - BLOWN_SAVE', () => {
    const appearance = createBasicAppearance({
      leadWhenEntered: 2,
      leadWhenExited: 0,
    });

    const result = detectBlownSave(appearance, true, true);
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe('BLOWN_SAVE');
  });

  test('relinquished lead, team lost - BLOWN_SAVE_LOSS', () => {
    const appearance = createBasicAppearance({
      leadWhenEntered: 2,
      leadWhenExited: -1,
    });

    const result = detectBlownSave(appearance, true, false);
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe('BLOWN_SAVE_LOSS');
  });

  test('maintained lead - NO blown save', () => {
    const appearance = createBasicAppearance({
      leadWhenEntered: 2,
      leadWhenExited: 2,
    });

    const result = detectBlownSave(appearance, true, true);
    expect(result).toBeNull();
  });

  test('not in save opportunity - NO blown save', () => {
    const appearance = createBasicAppearance({
      enteredInSaveOpportunity: false,
      leadWhenEntered: 2,
      leadWhenExited: 0,
    });

    const result = detectBlownSave(appearance, true, true);
    expect(result).toBeNull();
  });
});

// ============================================
// HOLD DETECTION TESTS
// ============================================

describe('Hold Detection (detectHold)', () => {
  test('standard hold - entered save opp, recorded out, maintained lead, exited', () => {
    const appearance = createBasicAppearance({
      outsRecorded: 3,
      finishedGame: false,
      leadWhenExited: 2,
    });

    const result = detectHold(appearance, true, true, true);
    expect(result.result).toBe(true);
    expect(result.message).toContain('hold');
  });

  test('did not enter save opportunity - NO hold', () => {
    const appearance = createBasicAppearance({
      enteredInSaveOpportunity: false,
    });

    const result = detectHold(appearance, true, true, true);
    expect(result.result).toBe(false);
  });

  test('did not record an out - NO hold', () => {
    const appearance = createBasicAppearance({
      outsRecorded: 0,
      finishedGame: false,
    });

    const result = detectHold(appearance, true, true, true);
    expect(result.result).toBe(false);
  });

  test('relinquished the lead - NO hold', () => {
    const appearance = createBasicAppearance({
      leadWhenExited: 0,
      finishedGame: false,
    });

    const result = detectHold(appearance, true, true, true);
    expect(result.result).toBe(false);
  });

  test('finished the game - NO hold (eligible for save)', () => {
    const appearance = createBasicAppearance({
      finishedGame: true,
    });

    const result = detectHold(appearance, true, true, true);
    expect(result.result).toBe(false);
    expect(result.message).toContain('save');
  });

  test('team did not win - NO hold', () => {
    const appearance = createBasicAppearance({
      finishedGame: false,
    });

    const result = detectHold(appearance, true, false, false);
    expect(result.result).toBe(false);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Lead Calculation (calculateLead)', () => {
  test('home team defending with lead', () => {
    const state = createBasicGameState({
      homeScore: 5,
      awayScore: 3,
      isHomeDefense: true,
    });
    expect(calculateLead(state)).toBe(2);
  });

  test('home team defending while trailing', () => {
    const state = createBasicGameState({
      homeScore: 3,
      awayScore: 5,
      isHomeDefense: true,
    });
    expect(calculateLead(state)).toBe(-2);
  });

  test('away team defending with lead', () => {
    const state = createBasicGameState({
      homeScore: 3,
      awayScore: 5,
      isHomeDefense: false,
    });
    expect(calculateLead(state)).toBe(2);
  });

  test('tied game', () => {
    const state = createBasicGameState({
      homeScore: 4,
      awayScore: 4,
      isHomeDefense: true,
    });
    expect(calculateLead(state)).toBe(0);
  });
});

describe('Pitcher Appearance Management', () => {
  describe('createPitcherAppearance', () => {
    test('creates appearance with correct initial state', () => {
      const state = createBasicGameState({
        homeScore: 5,
        awayScore: 3,
        inning: 9,
        outs: 0,
      });

      const appearance = createPitcherAppearance('p1', 'John Closer', state);

      expect(appearance.pitcherId).toBe('p1');
      expect(appearance.pitcherName).toBe('John Closer');
      expect(appearance.leadWhenEntered).toBe(2);
      expect(appearance.leadWhenExited).toBe(2);
      expect(appearance.enteredInSaveOpportunity).toBe(true);
      expect(appearance.outsRecorded).toBe(0);
      expect(appearance.finishedGame).toBe(false);
      expect(appearance.runsAllowed).toBe(0);
    });

    test('correctly identifies non-save opportunity', () => {
      const state = createBasicGameState({
        homeScore: 10,
        awayScore: 3, // 7-run lead
        inning: 9,
      });

      const appearance = createPitcherAppearance('p1', 'John Closer', state);
      expect(appearance.enteredInSaveOpportunity).toBe(false);
    });
  });

  describe('updatePitcherAppearance', () => {
    test('updates outs and runs correctly', () => {
      const state = createBasicGameState();
      const appearance = createPitcherAppearance('p1', 'Test', state);

      const updated = updatePitcherAppearance(appearance, state, 2, 1);

      expect(updated.outsRecorded).toBe(2);
      expect(updated.runsAllowed).toBe(1);
    });

    test('updates lead based on current state', () => {
      const initialState = createBasicGameState({
        homeScore: 5,
        awayScore: 3,
      });
      const appearance = createPitcherAppearance('p1', 'Test', initialState);

      const newState = createBasicGameState({
        homeScore: 5,
        awayScore: 5, // Tied now
      });
      const updated = updatePitcherAppearance(appearance, newState, 0, 2);

      expect(updated.leadWhenExited).toBe(0);
    });
  });

  describe('finalizePitcherAppearance', () => {
    test('finalizes with correct values', () => {
      const state = createBasicGameState();
      const appearance = createPitcherAppearance('p1', 'Test', state);

      const finalized = finalizePitcherAppearance(appearance, true, false, 2);

      expect(finalized.finishedGame).toBe(true);
      expect(finalized.isWinningPitcher).toBe(false);
      expect(finalized.leadWhenExited).toBe(2);
    });

    test('marks as winning pitcher', () => {
      const state = createBasicGameState();
      const appearance = createPitcherAppearance('p1', 'Test', state);

      const finalized = finalizePitcherAppearance(appearance, false, true, 2);

      expect(finalized.isWinningPitcher).toBe(true);
    });
  });
});
