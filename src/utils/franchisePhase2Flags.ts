import {
  LIVING_SEASON_FLAG_FAMILY,
  resolveFranchisePhase2FlagActivation,
  type FranchisePhase2FlagKey,
} from './franchisePhase2Activation';

let franchiseLivingSeasonContext: { enabled: boolean } | null = null;

export function setFranchiseLivingSeasonContext(
  ctx: { enabled: boolean } | null,
): void {
  franchiseLivingSeasonContext = ctx;
}

export const FRANCHISE_PHASE2_MORALE_ENABLED_DEFAULT = false;

let franchisePhase2MoraleEnabledOverride: boolean | null = null;

function resolvePhase2Flag(
  flagKey: FranchisePhase2FlagKey,
  testOverride: boolean | null,
  compiledDefault: boolean,
): boolean {
  const livingSeasonFallback =
    franchiseLivingSeasonContext?.enabled === true
    && LIVING_SEASON_FLAG_FAMILY.includes(flagKey)
      ? true
      : compiledDefault;
  return testOverride ?? resolveFranchisePhase2FlagActivation(flagKey, livingSeasonFallback);
}

export function isFranchisePhase2MoraleEnabled(): boolean {
  return resolvePhase2Flag('morale', franchisePhase2MoraleEnabledOverride, FRANCHISE_PHASE2_MORALE_ENABLED_DEFAULT);
}

export function setFranchisePhase2MoraleEnabledForTests(enabled: boolean | null): void {
  franchisePhase2MoraleEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT = false;

let franchisePhase2FameEnabledOverride: boolean | null = null;

export function isFranchisePhase2FameEnabled(): boolean {
  return resolvePhase2Flag('fame', franchisePhase2FameEnabledOverride, FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT);
}

export function setFranchisePhase2FameEnabledForTests(enabled: boolean | null): void {
  franchisePhase2FameEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT = false;

let franchisePhase2FlashpointEnabledOverride: boolean | null = null;

export function isFranchisePhase2FlashpointEnabled(): boolean {
  return resolvePhase2Flag('flashpoint', franchisePhase2FlashpointEnabledOverride, FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT);
}

export function setFranchisePhase2FlashpointEnabledForTests(enabled: boolean | null): void {
  franchisePhase2FlashpointEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_CHECKPOINT_ENABLED_DEFAULT = false;

let franchisePhase2CheckpointEnabledOverride: boolean | null = null;

export function isFranchisePhase2CheckpointEnabled(): boolean {
  return resolvePhase2Flag('checkpoint', franchisePhase2CheckpointEnabledOverride, FRANCHISE_PHASE2_CHECKPOINT_ENABLED_DEFAULT);
}

export function setFranchisePhase2CheckpointEnabledForTests(enabled: boolean | null): void {
  franchisePhase2CheckpointEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_TRAITS_ENABLED_DEFAULT = false;

let franchisePhase2TraitsEnabledOverride: boolean | null = null;

export function isFranchisePhase2TraitsEnabled(): boolean {
  return resolvePhase2Flag('traits', franchisePhase2TraitsEnabledOverride, FRANCHISE_PHASE2_TRAITS_ENABLED_DEFAULT);
}

export function setFranchisePhase2TraitsEnabledForTests(enabled: boolean | null): void {
  franchisePhase2TraitsEnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L10_ENABLED_DEFAULT = false;

let franchisePhase2L10EnabledOverride: boolean | null = null;

export function isFranchisePhase2L10Enabled(): boolean {
  return resolvePhase2Flag('l10', franchisePhase2L10EnabledOverride, FRANCHISE_PHASE2_L10_ENABLED_DEFAULT);
}

export function setFranchisePhase2L10EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L10EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L11_ENABLED_DEFAULT = false;

let franchisePhase2L11EnabledOverride: boolean | null = null;

export function isFranchisePhase2L11Enabled(): boolean {
  return resolvePhase2Flag('l11', franchisePhase2L11EnabledOverride, FRANCHISE_PHASE2_L11_ENABLED_DEFAULT);
}

export function setFranchisePhase2L11EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L11EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L12_ENABLED_DEFAULT = false;

let franchisePhase2L12EnabledOverride: boolean | null = null;

export function isFranchisePhase2L12Enabled(): boolean {
  return resolvePhase2Flag('l12', franchisePhase2L12EnabledOverride, FRANCHISE_PHASE2_L12_ENABLED_DEFAULT);
}

export function setFranchisePhase2L12EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L12EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L13_ENABLED_DEFAULT = false;

let franchisePhase2L13EnabledOverride: boolean | null = null;

export function isFranchisePhase2L13Enabled(): boolean {
  return resolvePhase2Flag('l13', franchisePhase2L13EnabledOverride, FRANCHISE_PHASE2_L13_ENABLED_DEFAULT);
}

export function setFranchisePhase2L13EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L13EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_L14_ENABLED_DEFAULT = false;

let franchisePhase2L14EnabledOverride: boolean | null = null;

export function isFranchisePhase2L14Enabled(): boolean {
  return resolvePhase2Flag('l14', franchisePhase2L14EnabledOverride, FRANCHISE_PHASE2_L14_ENABLED_DEFAULT);
}

export function setFranchisePhase2L14EnabledForTests(enabled: boolean | null): void {
  franchisePhase2L14EnabledOverride = enabled;
}

export const FRANCHISE_PHASE2_STADIUM_RECORDS_ENABLED_DEFAULT = false;

let franchisePhase2StadiumRecordsEnabledOverride: boolean | null = null;

export function isFranchisePhase2StadiumRecordsEnabled(): boolean {
  return resolvePhase2Flag('stadiumRecords', franchisePhase2StadiumRecordsEnabledOverride, FRANCHISE_PHASE2_STADIUM_RECORDS_ENABLED_DEFAULT);
}

export function setFranchisePhase2StadiumRecordsEnabledForTests(enabled: boolean | null): void {
  franchisePhase2StadiumRecordsEnabledOverride = enabled;
}

// CONTRACT_SNAKE_POC_2026-07-09: house Phase-2 activation pattern, deliberately default ON for
// JK's isolated viability test. Persisted/global activation and the test override still win.
export const SNAKE_DRAFT_POC_ENABLED_DEFAULT = false;

let snakeDraftPocEnabledOverride: boolean | null = null;

export function isSnakeDraftPocEnabled(): boolean {
  return resolvePhase2Flag('snakeDraftPoc', snakeDraftPocEnabledOverride, SNAKE_DRAFT_POC_ENABLED_DEFAULT);
}

export function setSnakeDraftPocEnabledForTests(enabled: boolean | null): void {
  snakeDraftPocEnabledOverride = enabled;
}

// CONTRACT_S1B_SETUP_UI_2026-07-10: the production snake-draft path stays dark until
// the captain deliberately flips this new v1 gate. It is separate from the older POC.
export const SNAKE_DRAFT_V1_ENABLED_DEFAULT = true;

let snakeDraftV1EnabledOverride: boolean | null = null;

export function isSnakeDraftV1Enabled(): boolean {
  return snakeDraftV1EnabledOverride ?? SNAKE_DRAFT_V1_ENABLED_DEFAULT;
}

export function setSnakeDraftV1EnabledForTests(enabled: boolean | null): void {
  snakeDraftV1EnabledOverride = enabled;
}

export const AUCTION_ADVISOR_COLOR_ENABLED_DEFAULT = true;

let auctionAdvisorColorEnabledOverride: boolean | null = null;

export function isAuctionAdvisorColorEnabled(): boolean {
  return resolvePhase2Flag(
    'auctionAdvisorColor',
    auctionAdvisorColorEnabledOverride,
    AUCTION_ADVISOR_COLOR_ENABLED_DEFAULT,
  );
}

export function setAuctionAdvisorColorEnabledForTests(enabled: boolean | null): void {
  auctionAdvisorColorEnabledOverride = enabled;
}
