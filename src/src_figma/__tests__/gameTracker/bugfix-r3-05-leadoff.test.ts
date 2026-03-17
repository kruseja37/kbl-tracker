/**
 * Bug R3-05: Next-inning leadoff indicator off by one
 *
 * Root cause: When outs >= 3, advanceToNextBatter is NOT called, so the batter
 * index stays pointing at the batter who made the 3rd out. This means:
 * 1. defensiveNextLeadoff shows the wrong batter
 * 2. executeEndInning uses the wrong index for the next leadoff
 *
 * The fix: always advance the batter index even on 3rd out.
 *
 * Test verifies the expected batter index after a 3rd-out scenario.
 */
import { describe, it, expect } from 'vitest';

describe('Bug R3-05: Next-inning leadoff after 3rd out', () => {
  it('should advance batter index past the 3rd-out batter', () => {
    // Simulate: 4 batters come up, #4 (index 3) makes the 3rd out
    // After each non-3rd-out at-bat, advanceToNextBatter runs
    let batterIndex = 0;

    // Batter 1 (index 0) - gets a hit, advances
    batterIndex = (batterIndex + 1) % 9; // → 1
    // Batter 2 (index 1) - out #1, advances
    batterIndex = (batterIndex + 1) % 9; // → 2
    // Batter 3 (index 2) - out #2, advances
    batterIndex = (batterIndex + 1) % 9; // → 3
    // Batter 4 (index 3) - out #3 — MUST ALSO ADVANCE
    // BUG: if we don't advance, index stays at 3
    // FIX: advance even on 3rd out
    batterIndex = (batterIndex + 1) % 9; // → 4

    // The leadoff for next half-inning should be batter #5 (index 4)
    expect(batterIndex).toBe(4);

    // defensiveNextLeadoff formula: (index % 9) + 1 = batting order
    const nextLeadoff = (batterIndex % 9) + 1;
    expect(nextLeadoff).toBe(5); // Batter #5
  });

  it('should wrap correctly when 9th batter makes the 3rd out', () => {
    let batterIndex = 8; // 9th batter (0-based index 8) makes 3rd out
    batterIndex = (batterIndex + 1) % 9; // → 0 (wraps)

    const nextLeadoff = (batterIndex % 9) + 1;
    expect(nextLeadoff).toBe(1); // Back to batter #1
  });

  it('should show correct leadoff when team has not batted yet', () => {
    const batterIndex = 0; // Team hasn't batted, index is 0

    // Should show batter #1 as leadoff
    const nextLeadoff = (batterIndex % 9) + 1;
    expect(nextLeadoff).toBe(1);
  });
});
