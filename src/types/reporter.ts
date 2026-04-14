/**
 * Editorial reporter-facing types.
 *
 * Guardrail: FameTier is distinct from the legacy 6-tier FameLevel in
 * src/types/game.ts, which remains Franchise-only and out of scope here.
 */

export type FameTier = 1 | 2 | 3 | 4 | 5;

export const FAME_TIER_LABEL: Record<FameTier, string> = {
  1: 'Unknown',
  2: 'Prospect',
  3: 'Veteran',
  4: 'Captain',
  5: 'Superstar',
};

export type PlayerArchetype =
  | 'GRIZZLED_VET'
  | 'HOT_ROOKIE'
  | 'JOURNEYMAN'
  | 'ACE'
  | 'SLUGGER'
  | 'SPEEDSTER'
  | 'GLOVE_WIZARD'
  | 'CLUBHOUSE_LEADER'
  | 'HEAD_CASE'
  | 'QUIET_PRO'
  | 'SHOWBOAT'
  | 'UTILITY_GUY';

export type EraFlavor = 'GOLDEN_AGE' | 'CLASSIC_TV' | 'MODERN_LOCAL';
