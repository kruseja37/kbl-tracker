export const FRANCHISE_PHASE2_MORALE_ENABLED_DEFAULT = false;

let franchisePhase2MoraleEnabledOverride: boolean | null = null;

export function isFranchisePhase2MoraleEnabled(): boolean {
  return franchisePhase2MoraleEnabledOverride ?? FRANCHISE_PHASE2_MORALE_ENABLED_DEFAULT;
}

export function setFranchisePhase2MoraleEnabledForTests(enabled: boolean | null): void {
  franchisePhase2MoraleEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT = false;

let franchisePhase2FameEnabledOverride: boolean | null = null;

export function isFranchisePhase2FameEnabled(): boolean {
  return franchisePhase2FameEnabledOverride ?? FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT;
}

export function setFranchisePhase2FameEnabledForTests(enabled: boolean | null): void {
  franchisePhase2FameEnabledOverride = enabled;
}
