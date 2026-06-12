export function prospectSalaryForDraftRound(round: number): number {
  if (round === 1) return 6665.94; // CALIBRATE (T5 bridge)
  if (round === 2) return 3999.57; // CALIBRATE (T5 bridge)
  if (round === 3) return 2333.08; // CALIBRATE (T5 bridge)
  return 1666.49; // CALIBRATE (T5 bridge)
}
