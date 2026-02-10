import { describe, it, expect } from 'vitest';
import {
  calculatePositionPlayerGrade,
  calculatePitcherGrade,
  calculateTwoWayPlayerGrade,
  calculatePositionWeightedRating,
  calculatePitcherWeightedRating,
  generateProspectGrade,
  generatePotentialCeiling,
  generateProspectRatings,
  generatePitcherProspectRatings,
  generateArsenal,
  generateFullProspect,
  POSITION_PLAYER_GRADE_THRESHOLDS,
  POSITION_STAT_BIAS,
  type Grade,
} from '../../../engines/gradeEngine';

describe('Grade Engine', () => {
  describe('calculatePositionPlayerGrade', () => {
    it('returns S for elite all-around players', () => {
      const grade = calculatePositionPlayerGrade({ power: 90, contact: 90, speed: 85, fielding: 82, arm: 78 });
      expect(grade).toBe('S');
    });

    it('returns D for lowest-tier players', () => {
      const grade = calculatePositionPlayerGrade({ power: 20, contact: 20, speed: 20, fielding: 20, arm: 20 });
      expect(grade).toBe('D');
    });

    it('returns B for average players', () => {
      const grade = calculatePositionPlayerGrade({ power: 60, contact: 60, speed: 50, fielding: 50, arm: 50 });
      expect(grade).toBe('B');
    });

    it('uses spec data-driven thresholds (MAJ-B4-004)', () => {
      // S threshold is 80, not 90 as in old test helper
      expect(POSITION_PLAYER_GRADE_THRESHOLDS[0]).toEqual({ grade: 'S', min: 80 });
      // B threshold is 55, not 65
      expect(POSITION_PLAYER_GRADE_THRESHOLDS[5]).toEqual({ grade: 'B', min: 55 });
      // C threshold is 38, not 50
      expect(POSITION_PLAYER_GRADE_THRESHOLDS[8]).toEqual({ grade: 'C', min: 38 });
    });
  });

  describe('calculatePitcherGrade', () => {
    it('returns S for elite pitchers', () => {
      const grade = calculatePitcherGrade({ velocity: 90, junk: 85, accuracy: 80 });
      expect(grade).toBe('S');
    });

    it('uses equal 1:1:1 weighting', () => {
      const weighted = calculatePitcherWeightedRating({ velocity: 60, junk: 60, accuracy: 60 });
      expect(weighted).toBeCloseTo(60, 0);
    });
  });

  describe('calculateTwoWayPlayerGrade (GAP-B4-006)', () => {
    it('applies 1.25x premium to combined value', () => {
      const grade = calculateTwoWayPlayerGrade(
        { power: 60, contact: 60, speed: 50, fielding: 50, arm: 50 },
        { velocity: 60, junk: 60, accuracy: 60 }
      );
      // Both are B-level (~55-60 weighted), combined × 1.25 / 2 should be high
      expect(['S', 'A+', 'A', 'A-', 'B+', 'B']).toContain(grade);
    });

    it('never returns below the better of the two individual grades', () => {
      // A mediocre position player + mediocre pitcher should still grade well combined
      const grade = calculateTwoWayPlayerGrade(
        { power: 50, contact: 50, speed: 40, fielding: 40, arm: 40 },
        { velocity: 50, junk: 50, accuracy: 50 }
      );
      // Individual grades would be around C+/C, but combined should be higher
      const gradeOrder: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
      expect(gradeOrder.indexOf(grade)).toBeLessThan(gradeOrder.indexOf('C'));
    });
  });

  describe('generateProspectGrade (GAP-B4-008)', () => {
    it('returns valid draft grade for round 1', () => {
      for (let i = 0; i < 20; i++) {
        const grade = generateProspectGrade(1);
        expect(['B', 'B-', 'C+', 'C', 'C-']).toContain(grade);
      }
    });

    it('returns valid grades for later rounds', () => {
      for (let i = 0; i < 20; i++) {
        const grade = generateProspectGrade(5);
        expect(['B', 'B-', 'C+', 'C', 'C-']).toContain(grade);
      }
    });

    it('round 1 tends to produce better grades than round 4+', () => {
      const gradeValue: Record<string, number> = { 'B': 5, 'B-': 4, 'C+': 3, 'C': 2, 'C-': 1 };
      let r1Total = 0, r4Total = 0;
      const trials = 500;
      for (let i = 0; i < trials; i++) {
        r1Total += gradeValue[generateProspectGrade(1)];
        r4Total += gradeValue[generateProspectGrade(4)];
      }
      expect(r1Total / trials).toBeGreaterThan(r4Total / trials);
    });
  });

  describe('generatePotentialCeiling (GAP-B4-009)', () => {
    it('returns valid ceiling for B grade', () => {
      for (let i = 0; i < 20; i++) {
        const ceiling = generatePotentialCeiling('B');
        expect(['A', 'A-', 'B+', 'B']).toContain(ceiling);
      }
    });

    it('C- grade has limited ceiling options', () => {
      for (let i = 0; i < 20; i++) {
        const ceiling = generatePotentialCeiling('C-');
        expect(['B', 'B-']).toContain(ceiling);
      }
    });
  });

  describe('generateProspectRatings (GAP-B4-007)', () => {
    it('generates ratings within 15-85 range', () => {
      for (let i = 0; i < 20; i++) {
        const ratings = generateProspectRatings('B', 'SS');
        expect(ratings.power).toBeGreaterThanOrEqual(15);
        expect(ratings.power).toBeLessThanOrEqual(85);
        expect(ratings.contact).toBeGreaterThanOrEqual(15);
        expect(ratings.speed).toBeGreaterThanOrEqual(15);
        expect(ratings.fielding).toBeGreaterThanOrEqual(15);
        expect(ratings.arm).toBeGreaterThanOrEqual(15);
      }
    });

    it('applies position bias — 1B gets power boost', () => {
      let totalPower = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const ratings = generateProspectRatings('B', '1B');
        totalPower += ratings.power;
      }
      // 1B has +15 power bias — average should be notably above baseline
      expect(totalPower / trials).toBeGreaterThan(45);
    });

    it('CF gets speed boost', () => {
      let totalSpeed = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const ratings = generateProspectRatings('B', 'CF');
        totalSpeed += ratings.speed;
      }
      expect(totalSpeed / trials).toBeGreaterThan(50);
    });
  });

  describe('generatePitcherProspectRatings (GAP-B4-010)', () => {
    it('generates ratings within 15-85 range', () => {
      for (let i = 0; i < 20; i++) {
        const ratings = generatePitcherProspectRatings('B', 'SP');
        expect(ratings.velocity).toBeGreaterThanOrEqual(15);
        expect(ratings.velocity).toBeLessThanOrEqual(85);
        expect(ratings.junk).toBeGreaterThanOrEqual(15);
        expect(ratings.accuracy).toBeGreaterThanOrEqual(15);
      }
    });

    it('SP gets accuracy emphasis', () => {
      let totalAcc = 0, totalVel = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const ratings = generatePitcherProspectRatings('B', 'SP');
        totalAcc += ratings.accuracy;
        totalVel += ratings.velocity;
      }
      // SP has +5 ACC, -2 VEL bias
      expect(totalAcc / trials).toBeGreaterThan(totalVel / trials);
    });

    it('CP gets velocity emphasis', () => {
      let totalVel = 0, totalAcc = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const ratings = generatePitcherProspectRatings('B', 'CP');
        totalVel += ratings.velocity;
        totalAcc += ratings.accuracy;
      }
      expect(totalVel / trials).toBeGreaterThan(totalAcc / trials);
    });
  });

  describe('generateArsenal (GAP-B4-010)', () => {
    it('always includes 4F and 2F', () => {
      for (let i = 0; i < 20; i++) {
        const arsenal = generateArsenal(50);
        expect(arsenal).toContain('4F');
        expect(arsenal).toContain('2F');
      }
    });

    it('high junk gets more off-speed pitches', () => {
      let highTotal = 0, lowTotal = 0;
      const trials = 50;
      for (let i = 0; i < trials; i++) {
        highTotal += generateArsenal(80).length;
        lowTotal += generateArsenal(30).length;
      }
      expect(highTotal / trials).toBeGreaterThan(lowTotal / trials);
    });
  });

  describe('generateFullProspect', () => {
    it('generates a complete position player prospect', () => {
      const prospect = generateFullProspect(1, 'SS', false);
      expect(prospect.isPitcher).toBe(false);
      expect(prospect.grade).toBeDefined();
      expect(prospect.potentialCeiling).toBeDefined();
      const ratings = prospect.ratings as { power: number; contact: number };
      expect(ratings.power).toBeGreaterThanOrEqual(15);
      expect(ratings.contact).toBeGreaterThanOrEqual(15);
    });

    it('generates a complete pitcher prospect with arsenal', () => {
      const prospect = generateFullProspect(1, 'SP', true, 'SP');
      expect(prospect.isPitcher).toBe(true);
      expect(prospect.arsenal).toBeDefined();
      expect(prospect.arsenal!.length).toBeGreaterThanOrEqual(3);
      const ratings = prospect.ratings as { velocity: number; junk: number };
      expect(ratings.velocity).toBeGreaterThanOrEqual(15);
    });
  });

  describe('POSITION_STAT_BIAS (GAP-B4-007)', () => {
    it('has entries for 8 positions', () => {
      expect(Object.keys(POSITION_STAT_BIAS)).toHaveLength(8);
    });

    it('C has defensive bias', () => {
      expect(POSITION_STAT_BIAS.C!.fielding).toBe(10);
      expect(POSITION_STAT_BIAS.C!.arm).toBe(10);
      expect(POSITION_STAT_BIAS.C!.speed).toBe(-10);
    });
  });
});
