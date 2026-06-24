import { describe, expect, test } from 'vitest';

import { gradeToTwentyEighty, type Grade } from '../gradeEngine';

const GRADES: readonly Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];

describe('gradeToTwentyEighty', () => {
  test('maps the letter ladder to integer 20-80 grades monotonically', () => {
    const mapped = GRADES.map((grade) => gradeToTwentyEighty(grade));

    expect(gradeToTwentyEighty('S')).toBe(80);
    expect(gradeToTwentyEighty('D')).toBe(20);
    expect(gradeToTwentyEighty('unknown' as Grade)).toBe(50);

    for (const value of mapped) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(20);
      expect(value).toBeLessThanOrEqual(80);
    }

    for (let index = 1; index < mapped.length; index += 1) {
      expect(mapped[index]).toBeLessThanOrEqual(mapped[index - 1]);
    }
  });
});
