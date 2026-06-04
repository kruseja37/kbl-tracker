export const FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION =
  'franchise-fan-morale-performance-gap-formula-v1';

export type FranchiseFanMoralePerformanceGapBand =
  | 'over-plus-4'
  | 'over-plus-2'
  | 'under-minus-2'
  | 'under-minus-4';

export interface FranchiseFanMoralePerformanceGapBaselineEvidence {
  id?: string;
  identityKey?: string;
  storageVersion?: string;
  expectedWinsPreviewContractVersion?: string;
  trueValuePreviewContractVersion?: string;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  expectedWinsEstimate: number | null;
  gamesPerTeam: number | null;
  status?: string;
}

export interface FranchiseFanMoralePerformanceGapInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  teamName?: string;
  baseline: FranchiseFanMoralePerformanceGapBaselineEvidence | null | undefined;
  actualWins: number;
  actualLosses?: number;
  gamesPlayed?: number;
}

export interface FranchiseFanMoralePerformanceGapEffect {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION;
  teamId: string;
  teamName: string;
  band: FranchiseFanMoralePerformanceGapBand;
  delta: number;
  actualWins: number;
  actualLosses: number | null;
  gamesPlayed: number;
  gamesPerTeam: number;
  baselineExpectedWins: number;
  expectedWinsToDate: number;
  performanceGap: number;
  baselineIdentity: string;
  baselineStorageVersion?: string;
  expectedWinsPreviewContractVersion?: string;
  trueValuePreviewContractVersion?: string;
  reason: string;
}

export interface FranchiseFanMoralePerformanceGapFormulaResult {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION;
  effects: FranchiseFanMoralePerformanceGapEffect[];
  blockers: string[];
  limitations: string[];
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

function scopeComplete(input: FranchiseFanMoralePerformanceGapInput): boolean {
  return Boolean(
    input.franchiseId &&
    input.seasonId &&
    input.statsScopeId &&
    Number.isInteger(input.seasonNumber) &&
    input.seasonNumber > 0,
  );
}

function baselineMatchesInputScope(input: FranchiseFanMoralePerformanceGapInput): boolean {
  const baseline = input.baseline;
  if (!baseline) return false;
  return (
    baseline.franchiseId === input.franchiseId &&
    baseline.seasonId === input.seasonId &&
    baseline.statsScopeId === input.statsScopeId &&
    baseline.seasonNumber === input.seasonNumber &&
    baseline.teamId === input.teamId
  );
}

function bandFromGap(gap: number): { band: FranchiseFanMoralePerformanceGapBand; delta: number } | null {
  if (gap >= 4) return { band: 'over-plus-4', delta: 2 };
  if (gap >= 2) return { band: 'over-plus-2', delta: 1 };
  if (gap <= -4) return { band: 'under-minus-4', delta: -2 };
  if (gap <= -2) return { band: 'under-minus-2', delta: -1 };
  return null;
}

export function buildFranchiseFanMoralePerformanceGapEffects(
  input: FranchiseFanMoralePerformanceGapInput,
): FranchiseFanMoralePerformanceGapFormulaResult {
  const blockers: string[] = [];
  const teamId = input.teamId.trim();
  const baseline = input.baseline;
  const limitations = [
    'Performance-gap prompts use durable expected-wins baseline evidence and current team record evidence only.',
    'Returned effects are confirmation-gated team fan morale draft targets only.',
    'Expected wins remain preview-only and are not trusted for automatic morale mutation, daily snapshots, designations, salary movement, relationships, offseason, or Mode 3.',
  ];

  if (!scopeComplete(input)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required for performance-gap fan morale prompts.');
  }
  if (!teamId) {
    blockers.push('A non-empty team id is required for performance-gap fan morale prompts.');
  }
  if (!baseline) {
    blockers.push('A durable expected-wins baseline snapshot is required for performance-gap fan morale prompts.');
  } else if (!baselineMatchesInputScope(input)) {
    blockers.push('Expected-wins baseline scope must exactly match the performance-gap franchise/season/stats/team scope.');
  }
  if (!finiteNumber(baseline?.expectedWinsEstimate) || (baseline?.expectedWinsEstimate ?? -1) < 0) {
    blockers.push('A non-negative baseline expected-wins estimate is required for performance-gap fan morale prompts.');
  }
  if (!finiteNumber(baseline?.gamesPerTeam) || (baseline?.gamesPerTeam ?? 0) <= 0) {
    blockers.push('Positive games-per-team metadata is required for performance-gap fan morale prompts.');
  }
  if (!nonNegativeInteger(input.actualWins)) {
    blockers.push('Actual wins must be a non-negative integer for performance-gap fan morale prompts.');
  }
  if (input.actualLosses !== undefined && !nonNegativeInteger(input.actualLosses)) {
    blockers.push('Actual losses must be a non-negative integer when provided for performance-gap fan morale prompts.');
  }
  if (input.gamesPlayed !== undefined && !nonNegativeInteger(input.gamesPlayed)) {
    blockers.push('Games played must be a non-negative integer when provided for performance-gap fan morale prompts.');
  }

  if (blockers.length > 0) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
      effects: [],
      blockers,
      limitations,
    };
  }

  const gamesPerTeam = baseline!.gamesPerTeam!;
  const actualLosses = input.actualLosses ?? null;
  const gamesPlayed = input.gamesPlayed ?? input.actualWins + (input.actualLosses ?? 0);
  if (gamesPlayed <= 0) {
    blockers.push('At least one played game is required for performance-gap fan morale prompts.');
  }
  if (gamesPlayed > gamesPerTeam) {
    blockers.push('Games played cannot exceed stored games-per-team metadata for performance-gap fan morale prompts.');
  }
  if (actualLosses !== null && gamesPlayed !== input.actualWins + actualLosses) {
    blockers.push('Games played must match actual wins plus losses when losses are provided.');
  }
  if (input.actualWins > gamesPlayed) {
    blockers.push('Actual wins cannot exceed games played for performance-gap fan morale prompts.');
  }

  if (blockers.length > 0) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
      effects: [],
      blockers,
      limitations,
    };
  }

  const expectedWinsToDate = rounded(baseline!.expectedWinsEstimate! * gamesPlayed / gamesPerTeam);
  const performanceGap = rounded(input.actualWins - expectedWinsToDate);
  const marker = bandFromGap(performanceGap);
  if (!marker) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
      effects: [],
      blockers: [
        `Performance gap ${performanceGap} is below the +/-2 game v1 fan morale prompt threshold.`,
      ],
      limitations,
    };
  }

  const teamName = input.teamName?.trim() || teamId;
  const direction = marker.delta > 0 ? '+' : '';
  const baselineIdentity =
    baseline!.identityKey ||
    baseline!.id ||
    `${baseline!.expectedWinsPreviewContractVersion ?? 'expected-wins-preview'}:${baseline!.trueValuePreviewContractVersion ?? 'true-value-preview'}`;

  return {
    formulaVersion: FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
    effects: [{
      formulaVersion: FRANCHISE_FAN_MORALE_PERFORMANCE_GAP_FORMULA_VERSION,
      teamId,
      teamName,
      band: marker.band,
      delta: marker.delta,
      actualWins: input.actualWins,
      actualLosses,
      gamesPlayed,
      gamesPerTeam,
      baselineExpectedWins: baseline!.expectedWinsEstimate!,
      expectedWinsToDate,
      performanceGap,
      baselineIdentity,
      baselineStorageVersion: baseline!.storageVersion,
      expectedWinsPreviewContractVersion: baseline!.expectedWinsPreviewContractVersion,
      trueValuePreviewContractVersion: baseline!.trueValuePreviewContractVersion,
      reason: `${teamName} is ${performanceGap > 0 ? `${performanceGap} game(s) above` : `${Math.abs(performanceGap)} game(s) below`} expected wins pace through ${gamesPlayed}/${gamesPerTeam} games: fan morale ${direction}${marker.delta}.`,
    }],
    blockers: [],
    limitations,
  };
}
