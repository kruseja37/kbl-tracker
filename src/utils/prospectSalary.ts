export function prospectSalaryForDraftRound(round: number): number {
  if (round === 1) return 2.0;
  if (round === 2) return 1.2;
  if (round === 3) return 0.7;
  return 0.5;
}
