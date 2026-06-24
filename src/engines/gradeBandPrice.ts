// Build-dark, no consumer yet (S7b wires); C/C- and D+/D midpoint overlap is documented at ratingsAdjustmentEngine.ts:158-161 and intentional T5-bridge behavior.
import type { Grade } from './gradeEngine';
import { GRADE_SALARY_BOUNDS } from './ratingsAdjustmentEngine';

export interface GradePriceRange {
  low: number;
  high: number;
}

export function gradeMidpointSalary(grade: Grade): number {
  const b = GRADE_SALARY_BOUNDS[grade];
  return (b.floor + b.ceiling) / 2;
}

export function gradeBandToPriceRange(band: { best: Grade; worst: Grade }): GradePriceRange {
  const high = gradeMidpointSalary(band.best);
  const low = gradeMidpointSalary(band.worst);
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
