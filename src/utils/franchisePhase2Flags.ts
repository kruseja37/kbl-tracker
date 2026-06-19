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

export const FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT = false;

let franchisePhase2FlashpointEnabledOverride: boolean | null = null;

export function isFranchisePhase2FlashpointEnabled(): boolean {
  return franchisePhase2FlashpointEnabledOverride ?? FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT;
}

export function setFranchisePhase2FlashpointEnabledForTests(enabled: boolean | null): void {
  franchisePhase2FlashpointEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_CHECKPOINT_ENABLED_DEFAULT = false;

let franchisePhase2CheckpointEnabledOverride: boolean | null = null;

export function isFranchisePhase2CheckpointEnabled(): boolean {
  return franchisePhase2CheckpointEnabledOverride ?? FRANCHISE_PHASE2_CHECKPOINT_ENABLED_DEFAULT;
}

export function setFranchisePhase2CheckpointEnabledForTests(enabled: boolean | null): void {
  franchisePhase2CheckpointEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_TRAITS_ENABLED_DEFAULT = false;

let franchisePhase2TraitsEnabledOverride: boolean | null = null;

export function isFranchisePhase2TraitsEnabled(): boolean {
  return franchisePhase2TraitsEnabledOverride ?? FRANCHISE_PHASE2_TRAITS_ENABLED_DEFAULT;
}

export function setFranchisePhase2TraitsEnabledForTests(enabled: boolean | null): void {
  franchisePhase2TraitsEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L10_ENABLED_DEFAULT = false;

let franchisePhase2L10EnabledOverride: boolean | null = null;

export function isFranchisePhase2L10Enabled(): boolean {
  return franchisePhase2L10EnabledOverride ?? FRANCHISE_PHASE2_L10_ENABLED_DEFAULT;
}

export function setFranchisePhase2L10EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L10EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L11_ENABLED_DEFAULT = false;

let franchisePhase2L11EnabledOverride: boolean | null = null;

export function isFranchisePhase2L11Enabled(): boolean {
  return franchisePhase2L11EnabledOverride ?? FRANCHISE_PHASE2_L11_ENABLED_DEFAULT;
}

export function setFranchisePhase2L11EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L11EnabledOverride = enabled;
}
