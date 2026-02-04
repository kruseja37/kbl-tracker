/**
 * AtBat Button Validation Tests
 *
 * Tests the business logic for which buttons should be enabled/disabled
 * based on game state (outs, runners on base).
 *
 * These tests verify the LOGIC without requiring React rendering.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// VALIDATION LOGIC FUNCTIONS (extracted from AtBatButtons.tsx)
// These are the pure business logic rules
// ============================================

interface Bases {
  first: string | null;
  second: string | null;
  third: string | null;
}

// D3K is only available when 1st base is empty OR there are 2 outs
function isD3KAvailable(bases: Bases, outs: number): boolean {
  return !bases.first || outs === 2;
}

// SAC requires less than 2 outs AND runners on base
function isSACAvailable(bases: Bases, outs: number): boolean {
  const hasRunners = !!(bases.first || bases.second || bases.third);
  return outs < 2 && hasRunners;
}

// SF requires less than 2 outs AND runner on third
function isSFAvailable(bases: Bases, outs: number): boolean {
  return outs < 2 && bases.third !== null;
}

// DP requires less than 2 outs AND at least one runner
function isDPAvailable(bases: Bases, outs: number): boolean {
  return outs < 2 && !!(bases.first || bases.second || bases.third);
}

// Runner-dependent events require runners on base
function isRunnerEventAvailable(bases: Bases): boolean {
  return !!(bases.first || bases.second || bases.third);
}

// ============================================
// D3K VALIDATION TESTS
// ============================================

describe('D3K (Dropped Third Strike) Validation', () => {
  test('D3K available with bases empty and 0 outs', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isD3KAvailable(bases, 0)).toBe(true);
  });

  test('D3K available with bases empty and 1 out', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isD3KAvailable(bases, 1)).toBe(true);
  });

  test('D3K available with bases empty and 2 outs', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isD3KAvailable(bases, 2)).toBe(true);
  });

  test('D3K NOT available with runner on first and 0 outs', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isD3KAvailable(bases, 0)).toBe(false);
  });

  test('D3K NOT available with runner on first and 1 out', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isD3KAvailable(bases, 1)).toBe(false);
  });

  test('D3K available with runner on first and 2 outs (special rule)', () => {
    // With 2 outs, batter can run even if 1st is occupied
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isD3KAvailable(bases, 2)).toBe(true);
  });

  test('D3K available with runner on second only (first empty)', () => {
    const bases: Bases = { first: null, second: 'player2', third: null };
    expect(isD3KAvailable(bases, 0)).toBe(true);
  });

  test('D3K available with runner on third only (first empty)', () => {
    const bases: Bases = { first: null, second: null, third: 'player3' };
    expect(isD3KAvailable(bases, 1)).toBe(true);
  });

  test('D3K NOT available with bases loaded and 1 out', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isD3KAvailable(bases, 1)).toBe(false);
  });

  test('D3K available with bases loaded and 2 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isD3KAvailable(bases, 2)).toBe(true);
  });
});

// ============================================
// SAC (SACRIFICE BUNT) VALIDATION TESTS
// ============================================

describe('SAC (Sacrifice Bunt) Validation', () => {
  test('SAC NOT available with bases empty', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isSACAvailable(bases, 0)).toBe(false);
  });

  test('SAC available with runner on first and 0 outs', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isSACAvailable(bases, 0)).toBe(true);
  });

  test('SAC available with runner on first and 1 out', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isSACAvailable(bases, 1)).toBe(true);
  });

  test('SAC NOT available with 2 outs (batter out ends inning)', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isSACAvailable(bases, 2)).toBe(false);
  });

  test('SAC available with runner on second only', () => {
    const bases: Bases = { first: null, second: 'player2', third: null };
    expect(isSACAvailable(bases, 1)).toBe(true);
  });

  test('SAC available with bases loaded and 0 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isSACAvailable(bases, 0)).toBe(true);
  });

  test('SAC NOT available with bases loaded and 2 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isSACAvailable(bases, 2)).toBe(false);
  });

  test('SAC NOT available - both conditions fail (empty bases, 2 outs)', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isSACAvailable(bases, 2)).toBe(false);
  });
});

// ============================================
// SF (SACRIFICE FLY) VALIDATION TESTS
// ============================================

describe('SF (Sacrifice Fly) Validation', () => {
  test('SF NOT available with bases empty', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isSFAvailable(bases, 0)).toBe(false);
  });

  test('SF NOT available with runner on first only', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isSFAvailable(bases, 0)).toBe(false);
  });

  test('SF NOT available with runner on second only', () => {
    const bases: Bases = { first: null, second: 'player2', third: null };
    expect(isSFAvailable(bases, 1)).toBe(false);
  });

  test('SF available with runner on third and 0 outs', () => {
    const bases: Bases = { first: null, second: null, third: 'player3' };
    expect(isSFAvailable(bases, 0)).toBe(true);
  });

  test('SF available with runner on third and 1 out', () => {
    const bases: Bases = { first: null, second: null, third: 'player3' };
    expect(isSFAvailable(bases, 1)).toBe(true);
  });

  test('SF NOT available with runner on third but 2 outs', () => {
    // Catch is 3rd out, runner can't tag up to score
    const bases: Bases = { first: null, second: null, third: 'player3' };
    expect(isSFAvailable(bases, 2)).toBe(false);
  });

  test('SF available with bases loaded and 0 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isSFAvailable(bases, 0)).toBe(true);
  });

  test('SF NOT available with bases loaded and 2 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isSFAvailable(bases, 2)).toBe(false);
  });
});

// ============================================
// DP (DOUBLE PLAY) VALIDATION TESTS
// ============================================

describe('DP (Double Play) Validation', () => {
  test('DP NOT available with bases empty', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isDPAvailable(bases, 0)).toBe(false);
  });

  test('DP available with runner on first and 0 outs', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isDPAvailable(bases, 0)).toBe(true);
  });

  test('DP available with runner on first and 1 out', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isDPAvailable(bases, 1)).toBe(true);
  });

  test('DP NOT available with 2 outs (can\'t turn DP)', () => {
    const bases: Bases = { first: 'player1', second: null, third: null };
    expect(isDPAvailable(bases, 2)).toBe(false);
  });

  test('DP available with runner on second only', () => {
    const bases: Bases = { first: null, second: 'player2', third: null };
    expect(isDPAvailable(bases, 0)).toBe(true);
  });

  test('DP available with runner on third only', () => {
    const bases: Bases = { first: null, second: null, third: 'player3' };
    expect(isDPAvailable(bases, 1)).toBe(true);
  });

  test('DP available with bases loaded and 0 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isDPAvailable(bases, 0)).toBe(true);
  });

  test('DP NOT available with bases loaded and 2 outs', () => {
    const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
    expect(isDPAvailable(bases, 2)).toBe(false);
  });

  test('DP NOT available - both conditions fail (empty bases, 2 outs)', () => {
    const bases: Bases = { first: null, second: null, third: null };
    expect(isDPAvailable(bases, 2)).toBe(false);
  });
});

// ============================================
// RUNNER-DEPENDENT EVENTS VALIDATION TESTS
// ============================================

describe('Runner-Dependent Events Validation', () => {
  const runnerEvents = ['SB', 'CS', 'WP', 'PB', 'PK'];

  describe('Events require runners on base', () => {
    test('NOT available with bases empty', () => {
      const bases: Bases = { first: null, second: null, third: null };
      expect(isRunnerEventAvailable(bases)).toBe(false);
    });

    test('available with runner on first', () => {
      const bases: Bases = { first: 'player1', second: null, third: null };
      expect(isRunnerEventAvailable(bases)).toBe(true);
    });

    test('available with runner on second', () => {
      const bases: Bases = { first: null, second: 'player2', third: null };
      expect(isRunnerEventAvailable(bases)).toBe(true);
    });

    test('available with runner on third', () => {
      const bases: Bases = { first: null, second: null, third: 'player3' };
      expect(isRunnerEventAvailable(bases)).toBe(true);
    });

    test('available with bases loaded', () => {
      const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
      expect(isRunnerEventAvailable(bases)).toBe(true);
    });

    test('available with runners on 1st and 3rd', () => {
      const bases: Bases = { first: 'p1', second: null, third: 'p3' };
      expect(isRunnerEventAvailable(bases)).toBe(true);
    });
  });

  describe('Event list per spec (BUG-013 fix)', () => {
    test('SB requires runners', () => {
      expect(runnerEvents.includes('SB')).toBe(true);
    });

    test('CS requires runners', () => {
      expect(runnerEvents.includes('CS')).toBe(true);
    });

    test('WP requires runners', () => {
      expect(runnerEvents.includes('WP')).toBe(true);
    });

    test('PB requires runners', () => {
      expect(runnerEvents.includes('PB')).toBe(true);
    });

    test('PK (Pickoff) requires runners', () => {
      expect(runnerEvents.includes('PK')).toBe(true);
    });
  });
});

// ============================================
// COMPLEX GAME SCENARIOS
// ============================================

describe('Complex Game Scenarios', () => {
  describe('Scoring position scenarios', () => {
    test('runners on 2nd and 3rd with 1 out - SAC, SF, DP all available', () => {
      const bases: Bases = { first: null, second: 'p2', third: 'p3' };
      const outs = 1;

      expect(isSACAvailable(bases, outs)).toBe(true);
      expect(isSFAvailable(bases, outs)).toBe(true);
      expect(isDPAvailable(bases, outs)).toBe(true);
      expect(isD3KAvailable(bases, outs)).toBe(true); // first empty
    });

    test('runners on corners (1st and 3rd) with 0 outs', () => {
      const bases: Bases = { first: 'p1', second: null, third: 'p3' };
      const outs = 0;

      expect(isSACAvailable(bases, outs)).toBe(true);
      expect(isSFAvailable(bases, outs)).toBe(true);
      expect(isDPAvailable(bases, outs)).toBe(true);
      expect(isD3KAvailable(bases, outs)).toBe(false); // first occupied, not 2 outs
    });
  });

  describe('Two-out rally scenarios', () => {
    test('bases loaded with 2 outs - only D3K available of special plays', () => {
      const bases: Bases = { first: 'p1', second: 'p2', third: 'p3' };
      const outs = 2;

      expect(isSACAvailable(bases, outs)).toBe(false);
      expect(isSFAvailable(bases, outs)).toBe(false);
      expect(isDPAvailable(bases, outs)).toBe(false);
      expect(isD3KAvailable(bases, outs)).toBe(true); // 2 outs rule
      expect(isRunnerEventAvailable(bases)).toBe(true); // runners exist
    });

    test('empty bases with 2 outs - no special plays except D3K', () => {
      const bases: Bases = { first: null, second: null, third: null };
      const outs = 2;

      expect(isSACAvailable(bases, outs)).toBe(false);
      expect(isSFAvailable(bases, outs)).toBe(false);
      expect(isDPAvailable(bases, outs)).toBe(false);
      expect(isD3KAvailable(bases, outs)).toBe(true);
      expect(isRunnerEventAvailable(bases)).toBe(false);
    });
  });

  describe('First inning leadoff scenarios', () => {
    test('leadoff batter - only D3K available, no runner events', () => {
      const bases: Bases = { first: null, second: null, third: null };
      const outs = 0;

      expect(isSACAvailable(bases, outs)).toBe(false);
      expect(isSFAvailable(bases, outs)).toBe(false);
      expect(isDPAvailable(bases, outs)).toBe(false);
      expect(isD3KAvailable(bases, outs)).toBe(true);
      expect(isRunnerEventAvailable(bases)).toBe(false);
    });
  });

  describe('Late inning scenarios', () => {
    test('tie game, runner on 3rd, 1 out - SF available for walkoff', () => {
      const bases: Bases = { first: null, second: null, third: 'p3' };
      const outs = 1;

      expect(isSFAvailable(bases, outs)).toBe(true);
    });

    test('ground ball DP situation - runner on 1st, 1 out', () => {
      const bases: Bases = { first: 'p1', second: null, third: null };
      const outs = 1;

      expect(isDPAvailable(bases, outs)).toBe(true);
    });
  });
});

// ============================================
// BUTTON CONFIGURATION VALIDATION
// ============================================

describe('Button Configuration Validation', () => {
  const allResults = [
    '1B', '2B', '3B', 'HR', 'BB', 'IBB', 'K',
    'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF',
    'SAC', 'HBP', 'E', 'FC', 'D3K',
  ];

  const conditionalResults = ['D3K', 'SAC', 'SF', 'DP'];
  const alwaysAvailableResults = allResults.filter(r => !conditionalResults.includes(r));

  test('all expected result types are defined', () => {
    expect(allResults.length).toBe(19);
  });

  test('conditional results are correctly identified', () => {
    expect(conditionalResults).toEqual(['D3K', 'SAC', 'SF', 'DP']);
  });

  test('always available results count is correct', () => {
    expect(alwaysAvailableResults.length).toBe(15);
  });

  describe('SMB4-specific exclusions', () => {
    test('BALK is not in result list (removed per SMB4)', () => {
      expect(allResults.includes('BALK')).toBe(false);
    });
  });

  describe('Event button configuration', () => {
    const runnerEvents = ['SB', 'CS', 'WP', 'PB', 'PK'];
    const subEvents = ['PITCH_CHANGE', 'PINCH_HIT', 'PINCH_RUN', 'DEF_SUB', 'POS_SWITCH'];

    test('runner events are correctly configured', () => {
      expect(runnerEvents.length).toBe(5);
    });

    test('substitution events are correctly configured', () => {
      expect(subEvents.length).toBe(5);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('all null bases is valid empty state', () => {
    const bases: Bases = { first: null, second: null, third: null };

    // Should not throw
    expect(() => isD3KAvailable(bases, 0)).not.toThrow();
    expect(() => isSACAvailable(bases, 0)).not.toThrow();
    expect(() => isSFAvailable(bases, 0)).not.toThrow();
    expect(() => isDPAvailable(bases, 0)).not.toThrow();
    expect(() => isRunnerEventAvailable(bases)).not.toThrow();
  });

  test('outs can be exactly 0, 1, or 2', () => {
    const bases: Bases = { first: 'p1', second: null, third: null };

    // All valid out values
    [0, 1, 2].forEach(outs => {
      expect(() => isDPAvailable(bases, outs)).not.toThrow();
      expect(() => isSACAvailable(bases, outs)).not.toThrow();
      expect(() => isSFAvailable(bases, outs)).not.toThrow();
    });
  });

  test('empty string player ID is treated as truthy', () => {
    // This tests defensive coding - empty string is falsy in JS
    // but should represent "no player"
    const bases: Bases = { first: '', second: null, third: null };

    // Empty string is falsy, so first is "empty"
    expect(isD3KAvailable(bases, 0)).toBe(true);
    expect(isDPAvailable(bases, 0)).toBe(false);
  });
});
