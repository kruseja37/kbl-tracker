/**
 * Scoreboard Logic Tests
 *
 * Tests the business logic for leverage index display categories
 * and other scoreboard calculations.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// LEVERAGE INDEX DISPLAY LOGIC (from Scoreboard.tsx)
// ============================================

interface LIDisplay {
  category: string;
  color: string;
  emoji: string;
}

function getLIDisplay(li: number): LIDisplay {
  if (li >= 5.0) return { category: 'EXTREME', color: '#ef4444', emoji: '🔥' };
  if (li >= 2.5) return { category: 'HIGH', color: '#f97316', emoji: '⚠️' };
  if (li >= 1.5) return { category: 'CLUTCH', color: '#eab308', emoji: '⚡' };
  if (li >= 0.85) return { category: 'MEDIUM', color: '#22c55e', emoji: '' };
  return { category: 'LOW', color: '#6b7280', emoji: '' };
}

// ============================================
// LEVERAGE INDEX CATEGORY TESTS
// ============================================

describe('Leverage Index Display Categories', () => {
  describe('EXTREME category (LI >= 5.0)', () => {
    test('LI 5.0 is EXTREME', () => {
      const result = getLIDisplay(5.0);
      expect(result.category).toBe('EXTREME');
      expect(result.emoji).toBe('🔥');
    });

    test('LI 7.5 is EXTREME', () => {
      const result = getLIDisplay(7.5);
      expect(result.category).toBe('EXTREME');
    });

    test('LI 10.0 is EXTREME', () => {
      const result = getLIDisplay(10.0);
      expect(result.category).toBe('EXTREME');
    });
  });

  describe('HIGH category (2.5 <= LI < 5.0)', () => {
    test('LI 2.5 is HIGH', () => {
      const result = getLIDisplay(2.5);
      expect(result.category).toBe('HIGH');
      expect(result.emoji).toBe('⚠️');
    });

    test('LI 3.5 is HIGH', () => {
      const result = getLIDisplay(3.5);
      expect(result.category).toBe('HIGH');
    });

    test('LI 4.99 is HIGH (just below EXTREME)', () => {
      const result = getLIDisplay(4.99);
      expect(result.category).toBe('HIGH');
    });
  });

  describe('CLUTCH category (1.5 <= LI < 2.5)', () => {
    test('LI 1.5 is CLUTCH', () => {
      const result = getLIDisplay(1.5);
      expect(result.category).toBe('CLUTCH');
      expect(result.emoji).toBe('⚡');
    });

    test('LI 2.0 is CLUTCH', () => {
      const result = getLIDisplay(2.0);
      expect(result.category).toBe('CLUTCH');
    });

    test('LI 2.49 is CLUTCH (just below HIGH)', () => {
      const result = getLIDisplay(2.49);
      expect(result.category).toBe('CLUTCH');
    });
  });

  describe('MEDIUM category (0.85 <= LI < 1.5)', () => {
    test('LI 0.85 is MEDIUM', () => {
      const result = getLIDisplay(0.85);
      expect(result.category).toBe('MEDIUM');
      expect(result.emoji).toBe('');
    });

    test('LI 1.0 is MEDIUM (baseline)', () => {
      const result = getLIDisplay(1.0);
      expect(result.category).toBe('MEDIUM');
    });

    test('LI 1.49 is MEDIUM (just below CLUTCH)', () => {
      const result = getLIDisplay(1.49);
      expect(result.category).toBe('MEDIUM');
    });
  });

  describe('LOW category (LI < 0.85)', () => {
    test('LI 0.84 is LOW (just below MEDIUM)', () => {
      const result = getLIDisplay(0.84);
      expect(result.category).toBe('LOW');
      expect(result.emoji).toBe('');
    });

    test('LI 0.5 is LOW', () => {
      const result = getLIDisplay(0.5);
      expect(result.category).toBe('LOW');
    });

    test('LI 0.1 is LOW', () => {
      const result = getLIDisplay(0.1);
      expect(result.category).toBe('LOW');
    });

    test('LI 0.0 is LOW', () => {
      const result = getLIDisplay(0.0);
      expect(result.category).toBe('LOW');
    });
  });
});

// ============================================
// LI COLOR TESTS
// ============================================

describe('Leverage Index Colors', () => {
  test('EXTREME uses red (#ef4444)', () => {
    expect(getLIDisplay(5.0).color).toBe('#ef4444');
  });

  test('HIGH uses orange (#f97316)', () => {
    expect(getLIDisplay(2.5).color).toBe('#f97316');
  });

  test('CLUTCH uses yellow (#eab308)', () => {
    expect(getLIDisplay(1.5).color).toBe('#eab308');
  });

  test('MEDIUM uses green (#22c55e)', () => {
    expect(getLIDisplay(1.0).color).toBe('#22c55e');
  });

  test('LOW uses gray (#6b7280)', () => {
    expect(getLIDisplay(0.5).color).toBe('#6b7280');
  });
});

// ============================================
// LI EMOJI TESTS
// ============================================

describe('Leverage Index Emojis', () => {
  test('EXTREME has fire emoji 🔥', () => {
    expect(getLIDisplay(5.0).emoji).toBe('🔥');
  });

  test('HIGH has warning emoji ⚠️', () => {
    expect(getLIDisplay(2.5).emoji).toBe('⚠️');
  });

  test('CLUTCH has lightning emoji ⚡', () => {
    expect(getLIDisplay(1.5).emoji).toBe('⚡');
  });

  test('MEDIUM has no emoji', () => {
    expect(getLIDisplay(1.0).emoji).toBe('');
  });

  test('LOW has no emoji', () => {
    expect(getLIDisplay(0.5).emoji).toBe('');
  });
});

// ============================================
// BOUNDARY VALUE TESTS
// ============================================

describe('Leverage Index Boundary Values', () => {
  const boundaries = [
    { li: 4.99, expected: 'HIGH' },
    { li: 5.00, expected: 'EXTREME' },
    { li: 5.01, expected: 'EXTREME' },
    { li: 2.49, expected: 'CLUTCH' },
    { li: 2.50, expected: 'HIGH' },
    { li: 2.51, expected: 'HIGH' },
    { li: 1.49, expected: 'MEDIUM' },
    { li: 1.50, expected: 'CLUTCH' },
    { li: 1.51, expected: 'CLUTCH' },
    { li: 0.84, expected: 'LOW' },
    { li: 0.85, expected: 'MEDIUM' },
    { li: 0.86, expected: 'MEDIUM' },
  ];

  boundaries.forEach(({ li, expected }) => {
    test(`LI ${li} should be ${expected}`, () => {
      expect(getLIDisplay(li).category).toBe(expected);
    });
  });
});

// ============================================
// GAME SCENARIO LI TESTS
// ============================================

describe('Real Game Scenario LI Values', () => {
  describe('Low leverage situations', () => {
    test('Early inning blowout (LI ~0.2)', () => {
      const result = getLIDisplay(0.2);
      expect(result.category).toBe('LOW');
    });

    test('Top of 1st, no outs, bases empty (LI ~0.9)', () => {
      const result = getLIDisplay(0.9);
      expect(result.category).toBe('MEDIUM');
    });
  });

  describe('High leverage situations', () => {
    test('Bottom 9th, tie game, bases loaded, 2 outs (LI ~8+)', () => {
      const result = getLIDisplay(8.5);
      expect(result.category).toBe('EXTREME');
    });

    test('9th inning, winning run on 2nd, 1 out (LI ~3.0)', () => {
      const result = getLIDisplay(3.0);
      expect(result.category).toBe('HIGH');
    });

    test('7th inning, 1-run game, runners on (LI ~2.0)', () => {
      const result = getLIDisplay(2.0);
      expect(result.category).toBe('CLUTCH');
    });
  });

  describe('Typical game situations', () => {
    test('Middle innings, close game (LI ~1.0-1.5)', () => {
      expect(getLIDisplay(1.2).category).toBe('MEDIUM');
    });

    test('Save situation entering 9th (LI ~1.5-2.5)', () => {
      expect(getLIDisplay(1.8).category).toBe('CLUTCH');
    });
  });
});

// ============================================
// INNING ARROW DISPLAY LOGIC
// ============================================

describe('Inning Arrow Display', () => {
  type HalfInning = 'TOP' | 'BOTTOM';

  function getInningArrow(halfInning: HalfInning): string {
    return halfInning === 'TOP' ? '▲' : '▼';
  }

  test('TOP of inning shows up arrow ▲', () => {
    expect(getInningArrow('TOP')).toBe('▲');
  });

  test('BOTTOM of inning shows down arrow ▼', () => {
    expect(getInningArrow('BOTTOM')).toBe('▼');
  });
});

// ============================================
// OUT DOT DISPLAY LOGIC
// ============================================

describe('Out Dot Display Logic', () => {
  function isOutFilled(dotIndex: number, outs: number): boolean {
    return dotIndex < outs;
  }

  describe('0 outs', () => {
    test('dot 0 is not filled', () => {
      expect(isOutFilled(0, 0)).toBe(false);
    });
    test('dot 1 is not filled', () => {
      expect(isOutFilled(1, 0)).toBe(false);
    });
    test('dot 2 is not filled', () => {
      expect(isOutFilled(2, 0)).toBe(false);
    });
  });

  describe('1 out', () => {
    test('dot 0 is filled', () => {
      expect(isOutFilled(0, 1)).toBe(true);
    });
    test('dot 1 is not filled', () => {
      expect(isOutFilled(1, 1)).toBe(false);
    });
    test('dot 2 is not filled', () => {
      expect(isOutFilled(2, 1)).toBe(false);
    });
  });

  describe('2 outs', () => {
    test('dot 0 is filled', () => {
      expect(isOutFilled(0, 2)).toBe(true);
    });
    test('dot 1 is filled', () => {
      expect(isOutFilled(1, 2)).toBe(true);
    });
    test('dot 2 is not filled', () => {
      expect(isOutFilled(2, 2)).toBe(false);
    });
  });
});

// ============================================
// LI CATEGORY DISPLAY LOGIC (visibility)
// ============================================

describe('LI Category Label Visibility', () => {
  // Category label only shows when LI >= 1.5
  function shouldShowCategoryLabel(li: number): boolean {
    return li >= 1.5;
  }

  test('LI 1.49 does not show category label', () => {
    expect(shouldShowCategoryLabel(1.49)).toBe(false);
  });

  test('LI 1.50 shows category label', () => {
    expect(shouldShowCategoryLabel(1.50)).toBe(true);
  });

  test('LI 2.5 (HIGH) shows category label', () => {
    expect(shouldShowCategoryLabel(2.5)).toBe(true);
  });

  test('LI 5.0 (EXTREME) shows category label', () => {
    expect(shouldShowCategoryLabel(5.0)).toBe(true);
  });

  test('LI 1.0 (MEDIUM) does not show category label', () => {
    expect(shouldShowCategoryLabel(1.0)).toBe(false);
  });

  test('LI 0.5 (LOW) does not show category label', () => {
    expect(shouldShowCategoryLabel(0.5)).toBe(false);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('negative LI is LOW', () => {
    const result = getLIDisplay(-1.0);
    expect(result.category).toBe('LOW');
  });

  test('very large LI is still EXTREME', () => {
    const result = getLIDisplay(100.0);
    expect(result.category).toBe('EXTREME');
  });

  test('LI with many decimal places', () => {
    const result = getLIDisplay(1.499999999);
    expect(result.category).toBe('MEDIUM');
  });

  test('LI exactly at threshold 5.0', () => {
    const result = getLIDisplay(5.0);
    expect(result.category).toBe('EXTREME');
  });
});
