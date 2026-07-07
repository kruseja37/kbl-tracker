export interface DraftFanMoraleTeamPayroll {
  teamId: string;
  payroll: number;
}

export interface DraftFanMoraleResult {
  teamId: string;
  startingFanMorale: number;
  normalizedRank: number;
  penalty: number;
}

export interface DraftFanMoraleTuning {
  neutralMorale: number;
  highThreshold: number;
  lowThreshold: number;
  curveSteepness: number;
  lowSideMaxPenalty: number;
  highSideMaxPenalty: number;
  moraleMin: number;
  moraleMax: number;
}

export const DRAFT_FAN_MORALE_TUNING: DraftFanMoraleTuning = {
  neutralMorale: 50, // RB-16 sim-tune §11/§13
  highThreshold: 0.75, // RB-16 sim-tune §11/§13
  lowThreshold: 0.25, // RB-16 sim-tune §11/§13
  curveSteepness: 2, // RB-16 sim-tune §11/§13
  lowSideMaxPenalty: 15, // RB-16 sim-tune §11/§13
  highSideMaxPenalty: 30, // RB-16 sim-tune §11/§13; §7 high side 2× low side
  moraleMin: 0, // RB-16 sim-tune §11/§13
  moraleMax: 100, // RB-16 sim-tune §11/§13
};

export function computeDraftFanMorale(
  teamPayrolls: readonly DraftFanMoraleTeamPayroll[],
  tuning: DraftFanMoraleTuning = DRAFT_FAN_MORALE_TUNING,
): DraftFanMoraleResult[] {
  if (teamPayrolls.length <= 1 || allPayrollsEqual(teamPayrolls)) {
    return teamPayrolls.map((team) => neutralResult(team.teamId, tuning));
  }

  const rankByTeamId = computeNormalizedRanks(teamPayrolls);

  return teamPayrolls.map((team) => {
    const normalizedRank = rankByTeamId.get(team.teamId) ?? 0.5;
    const highExcess = Math.max(
      0,
      (normalizedRank - tuning.highThreshold) / (1 - tuning.highThreshold),
    );
    const lowExcess = Math.max(
      0,
      (tuning.lowThreshold - normalizedRank) / tuning.lowThreshold,
    );
    const penalty = ramp(highExcess, tuning.highSideMaxPenalty, tuning.curveSteepness)
      + ramp(lowExcess, tuning.lowSideMaxPenalty, tuning.curveSteepness);
    const startingFanMorale = clamp(
      tuning.neutralMorale - penalty,
      tuning.moraleMin,
      tuning.moraleMax,
    );

    return {
      teamId: team.teamId,
      startingFanMorale,
      normalizedRank,
      penalty,
    };
  });
}

function allPayrollsEqual(teamPayrolls: readonly DraftFanMoraleTeamPayroll[]): boolean {
  const payrolls = teamPayrolls.map((team) => team.payroll);
  return Math.max(...payrolls) === Math.min(...payrolls);
}

function neutralResult(teamId: string, tuning: DraftFanMoraleTuning): DraftFanMoraleResult {
  return {
    teamId,
    startingFanMorale: clamp(tuning.neutralMorale, tuning.moraleMin, tuning.moraleMax),
    normalizedRank: 0.5,
    penalty: 0,
  };
}

function computeNormalizedRanks(
  teamPayrolls: readonly DraftFanMoraleTeamPayroll[],
): Map<string, number> {
  const sorted = [...teamPayrolls].sort((left, right) => {
    const payrollOrder = left.payroll - right.payroll;
    return payrollOrder || left.teamId.localeCompare(right.teamId);
  });
  const rankByTeamId = new Map<string, number>();

  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].payroll === sorted[start].payroll) {
      end += 1;
    }

    const averageRankIndex = (start + end) / 2;
    const normalizedRank = averageRankIndex / (sorted.length - 1);

    for (let index = start; index <= end; index += 1) {
      rankByTeamId.set(sorted[index].teamId, normalizedRank);
    }

    start = end + 1;
  }

  return rankByTeamId;
}

function ramp(excess: number, maxPenalty: number, curveSteepness: number): number {
  if (excess <= 0) return 0;

  return maxPenalty
    * (Math.exp(curveSteepness * excess) - 1)
    / (Math.exp(curveSteepness) - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
