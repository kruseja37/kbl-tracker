import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';

export type PoolAffordabilityState =
  | 'too_tight'
  | 'bargain_heavy'
  | 'neutral'
  | 'inflationary'
  | 'very_loose';

export type PoolAffordabilityReasonCode =
  | 'expected-draft-window'
  | 'legal-fill-floor'
  | 'star-affordability-guard'
  | 'pool-shortfall'
  | 'invalid-values-discounted'
  | 'cap-well-below-neutral'
  | 'cap-below-neutral'
  | 'cap-near-neutral'
  | 'cap-above-neutral'
  | 'cap-far-above-neutral';

export interface PoolAffordabilityPlayer {
  id: string;
  economicValue?: number | null;
  iv?: number | null;
  salary?: number | null;
  value?: number | null;
}

export interface PoolAffordabilityDiagnosticInput {
  poolPlayers: readonly PoolAffordabilityPlayer[];
  teamCount: number;
  rosterSlotsPerTeam: number;
  currentCapPerTeam: number;
  minimumFillCost?: number;
  poolQualityCenter?: number;
  presetLabel?: string;
  sourceLabel?: string;
}

export interface PoolAffordabilityDiagnostic {
  currentCapPerTeam: number;
  recommendedNeutralCapPerTeam: number;
  capRatio: number;
  affordabilityState: PoolAffordabilityState;
  rosterSlotsTotal: number;
  expectedDraftedCount: number;
  poolSize: number;
  expectedDraftWindowValue: number;
  legalMinimumFillPerTeam: number;
  starAffordabilityGuard: number;
  invalidValueCount: number;
  draftedWindowIds: string[];
  reasonCodes: PoolAffordabilityReasonCode[];
  summary: string;
  poolQualityCenter?: number;
  presetLabel?: string;
  sourceLabel?: string;
}

function finitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function economicValueFor(player: PoolAffordabilityPlayer): number | null {
  if (finitePositive(player.economicValue)) return player.economicValue;
  if (finitePositive(player.iv)) return player.iv;
  if (finitePositive(player.salary)) return player.salary;
  if (finitePositive(player.value)) return player.value;
  return null;
}

function wholeDollars(value: number): number {
  return Math.max(0, Math.round(value));
}

function stateForRatio(capRatio: number): PoolAffordabilityState {
  if (capRatio < 0.85) return 'too_tight';
  if (capRatio < 0.95) return 'bargain_heavy';
  if (capRatio <= 1.10) return 'neutral';
  if (capRatio <= 1.35) return 'inflationary';
  return 'very_loose';
}

function capReasonForState(state: PoolAffordabilityState): PoolAffordabilityReasonCode {
  if (state === 'too_tight') return 'cap-well-below-neutral';
  if (state === 'bargain_heavy') return 'cap-below-neutral';
  if (state === 'neutral') return 'cap-near-neutral';
  if (state === 'inflationary') return 'cap-above-neutral';
  return 'cap-far-above-neutral';
}

function summaryForState(state: PoolAffordabilityState): string {
  if (state === 'too_tight') return 'Cap is well below neutral for this pool.';
  if (state === 'bargain_heavy') return 'Cap is below neutral; good players may be discounted.';
  if (state === 'neutral') return 'Cap roughly fits this pool.';
  if (state === 'inflationary') return 'Cap is above neutral; prices may inflate.';
  return 'Cap is far above neutral; too much money may chase the pool.';
}

export function computePoolAffordabilityDiagnostic(
  input: PoolAffordabilityDiagnosticInput,
): PoolAffordabilityDiagnostic {
  const teamCount = Math.max(0, Math.floor(input.teamCount));
  const rosterSlotsPerTeam = Math.max(0, Math.floor(input.rosterSlotsPerTeam));
  const expectedDraftedCount = teamCount * rosterSlotsPerTeam;
  const minimumFillCost = finitePositive(input.minimumFillCost)
    ? input.minimumFillCost
    : LEAGUE_MINIMUM_SALARY;
  const legalMinimumFillPerTeam = wholeDollars(rosterSlotsPerTeam * minimumFillCost);
  const currentCapPerTeam = wholeDollars(input.currentCapPerTeam);

  let invalidValueCount = 0;
  const valuedPlayers = input.poolPlayers.map((player) => {
    const value = economicValueFor(player);
    if (value === null) invalidValueCount += 1;
    return {
      id: player.id,
      value: wholeDollars(value ?? minimumFillCost),
    };
  }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));

  const draftedWindow = valuedPlayers.slice(0, expectedDraftedCount);
  const expectedDraftWindowValue = draftedWindow.reduce((sum, player) => sum + player.value, 0);
  const averageWindowValuePerTeam = teamCount > 0 ? expectedDraftWindowValue / teamCount : 0;
  const topPlayerValue = valuedPlayers[0]?.value ?? wholeDollars(minimumFillCost);
  const starAffordabilityGuard = wholeDollars(
    rosterSlotsPerTeam > 0
      ? topPlayerValue + Math.max(0, rosterSlotsPerTeam - 1) * minimumFillCost
      : 0,
  );
  const recommendedNeutralCapPerTeam = wholeDollars(Math.max(
    averageWindowValuePerTeam,
    legalMinimumFillPerTeam,
    starAffordabilityGuard,
  ));
  const capRatio = recommendedNeutralCapPerTeam > 0
    ? currentCapPerTeam / recommendedNeutralCapPerTeam
    : 1;
  const affordabilityState = stateForRatio(capRatio);
  const reasonCodes: PoolAffordabilityReasonCode[] = ['expected-draft-window'];

  if (recommendedNeutralCapPerTeam === legalMinimumFillPerTeam) {
    reasonCodes.push('legal-fill-floor');
  }
  if (recommendedNeutralCapPerTeam === starAffordabilityGuard && starAffordabilityGuard > averageWindowValuePerTeam) {
    reasonCodes.push('star-affordability-guard');
  }
  if (valuedPlayers.length < expectedDraftedCount) {
    reasonCodes.push('pool-shortfall');
  }
  if (invalidValueCount > 0) {
    reasonCodes.push('invalid-values-discounted');
  }
  reasonCodes.push(capReasonForState(affordabilityState));

  return {
    currentCapPerTeam,
    recommendedNeutralCapPerTeam,
    capRatio,
    affordabilityState,
    rosterSlotsTotal: expectedDraftedCount,
    expectedDraftedCount,
    poolSize: input.poolPlayers.length,
    expectedDraftWindowValue,
    legalMinimumFillPerTeam,
    starAffordabilityGuard,
    invalidValueCount,
    draftedWindowIds: draftedWindow.map((player) => player.id),
    reasonCodes,
    summary: summaryForState(affordabilityState),
    poolQualityCenter: input.poolQualityCenter,
    presetLabel: input.presetLabel,
    sourceLabel: input.sourceLabel,
  };
}
