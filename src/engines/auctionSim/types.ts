import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import type { Band, BandPriorities } from '../leagueConstruction';
import type { Smb4PlayerInput } from '../smb4GradeEmulator';

export type AuctionSimGrade =
  | 'S'
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'C-'
  | 'D+'
  | 'D'
  | 'D-';

export type AuctionSimGradeBand = 'elite' | 'strong' | 'core' | 'filler';

export interface AuctionSimPlayer {
  playerId: string;
  iv: number;
  ivPercentile?: number;
  /** Sim-only explicit salary when the source provides one; otherwise economyAdapter falls back. */
  salary?: number;
  /** Sim-only explicit cap hit when the source provides one; otherwise economyAdapter falls back. */
  capHit?: number;
  /** Sim-only explicit base value; defaults to IV to match the verified auction value primitive. */
  baseValue?: number;
  /** Optional production-shaped archetype weights; used only with team band priorities. */
  archetypeWeights?: Partial<Record<Band, number>>;
  /**
   * Precomputed canonical analyzer numeric score. Prefer `smb4Input` when a full player payload is
   * available; use this for generated fixtures or sources that already store the oracle score.
   */
  numericGrade?: number;
  grade?: AuctionSimGrade | string;
  /** Optional full SMB4 rating payload; diagnostics score this through `scoreSmb4Player`. */
  smb4Input?: Smb4PlayerInput;
  pos?: RosterSlotPlayer;
  archetypeTags?: readonly string[];
  /** Optional sim-only fit read; pool-shaping uses this before deterministic id ties. */
  fitScore?: number;
}

export interface AuctionSimTeamInput {
  teamId: string;
  budget?: number;
  salaryCap?: number;
  currentSalary?: number;
  bandPriorities?: BandPriorities;
}

export type AutoFillPriceMode = 'zero' | 'reserve';
export type AuctionSimNominationPolicy = 'starFirst' | 'needFirst' | 'marketPressure' | 'randomSeeded';
export type AuctionSimBiddingPolicy =
  | 'naive'
  | 'rationalBaseline'
  | 'marginalValueV1'
  | 'marginalValueV2Liquidity';
export type AuctionSimLiquidityPenaltyShape =
  | 'linear'
  | 'softplus'
  | 'quadraticAfterThreshold'
  | 'slotScheduled';

export interface AuctionSimConfig {
  teamCount: number;
  rosterSize: number;
  budgetPerTeam: number;
  bidIncrement: number;
  reserveFractionK: number;
  autoFillPriceMode: AutoFillPriceMode;
  nominationPolicy: AuctionSimNominationPolicy;
  biddingPolicy: AuctionSimBiddingPolicy;
  seed: string;
  spotBudgetCheckpoint: number;
  minimumCompletionPrice: number;
  maxLots?: number;
  /** Sim-only search mode. `exact` disables projection pruning for small/test fixtures. */
  completionSearchMode?: 'beam' | 'exact';
  /** Sim-only cap for projection candidates per roster-need bucket; ignored in exact mode. */
  maxCandidatesPerNeed?: number;
  /** Sim-only beam width for projected roster construction. Defaults conservatively to 1. */
  beamWidth?: number;
  /** Sim-only WTP solver. `binary` is more faithful; `singlePass` is the matrix approximation. */
  marginalBidSearchMode?: 'binary' | 'singlePass';
  /** Sim-only roster projection solver. `beam` searches value; `completionQuote` uses legal-completion picks. */
  rosterProjectionMode?: 'beam' | 'completionQuote';
  /** V2 sim-only liquidity penalty strength. Zero means no liquidity penalty. */
  liquidityPenaltyWeight?: number;
  /** V2 sim-only target cash remaining near the roster spot checkpoint. */
  targetSpot11CashRatio?: number;
  /** V2 sim-only numeric-grade percentile used for quality-adjusted completion. */
  qualityCompletionTargetPercentile?: number;
  /** V2 sim-only target surplus cushion relative to team budget. */
  minQualitySurplusRatio?: number;
  /** V2 sim-only exponent for how strongly open roster slots preserve cash. */
  openSlotPenaltyExponent?: number;
  /** V2.1 sim-only liquidity penalty curve. */
  liquidityPenaltyShape?: AuctionSimLiquidityPenaltyShape;
  /** Matrix-only audit hook: also compute a V1 WTP baseline for V2 bids. */
  liquidityAuditV1Baseline?: boolean;
  /** Matrix-only switch to avoid retaining rich logs when aggregate metrics are enough. */
  detailedLogs?: boolean;
  /** Matrix-only guardrail used by callers that enforce a wall-clock limit. */
  timeLimitMs?: number;
  /** Report-only matrix context for memo keys and diagnostics. */
  poolPolicyName?: string;
  /** Report-only basis labels; V1 keeps both at IV unless later design docs authorize a change. */
  reserveCostBasis?: 'iv';
  valueBasis?: 'iv';
}

export type AuctionSimInvariantName =
  | 'cashBelowZero'
  | 'acceptedPriceExceedsCash'
  | 'acceptedPriceExceedsWtp'
  | 'acceptedPriceExceedsMaxLegalBid'
  | 'completionSurplusNegativeAfterAcceptedBid'
  | 'fullRosterBid'
  | 'impossibleCompletionSilentlyRepaired'
  | 'autoFillCreatesNegativeCash'
  | 'soldBelowReserve'
  | 'clearingPriceExceedsWinnerWtp'
  | 'clearingPriceExceedsWinnerMaxLegalBid';

export interface AuctionSimInvariantFailure {
  invariantName: AuctionSimInvariantName;
  seed: string;
  nominationNumber: number | null;
  teamId: string | null;
  playerId: string | null;
  playerName?: string;
  biddingPolicy: AuctionSimBiddingPolicy;
  reserveFractionK: number;
  autoFillPriceMode: AutoFillPriceMode;
  cashBefore: number | null;
  bidPrice: number | null;
  cashAfter: number | null;
  wtp: number | null;
  maxLegalBid: number | null;
  cheapestCompletionCostBefore: number | null;
  cheapestCompletionCostAfter: number | null;
  completionSurplusBefore: number | null;
  completionSurplusAfter: number | null;
  rosterSizeBefore: number | null;
  rosterSizeAfter: number | null;
  openSlotsBefore: number | null;
  openSlotsAfter: number | null;
  autoFillInvolved: boolean;
}

export interface AuctionSimProfile {
  bestProjectedRosterValueCalls: number;
  bestProjectedRosterValueCacheHits: number;
  bestProjectedRosterValueCacheMisses: number;
  completionSearchCalls: number;
  completionCandidateCount: number;
  completionCacheHits: number;
  completionCacheMisses: number;
  wtpEvaluations: number;
}

export const DEFAULT_AUCTION_SIM_CONFIG: AuctionSimConfig = {
  teamCount: 4,
  rosterSize: 22,
  budgetPerTeam: 1_000_000,
  bidIncrement: 1_000,
  reserveFractionK: 0,
  autoFillPriceMode: 'zero',
  nominationPolicy: 'starFirst',
  biddingPolicy: 'rationalBaseline',
  seed: 'auction-sim',
  spotBudgetCheckpoint: 11,
  minimumCompletionPrice: 0,
};

export interface AuctionSimRosterEntry {
  playerId: string;
  iv: number;
  numericGrade: number | null;
  letterGrade?: string;
  grade?: string;
  gradeBand: AuctionSimGradeBand;
  salary: number;
  source: 'auction' | 'autoFill';
  pos?: RosterSlotPlayer;
}

export interface AuctionSimTeamState {
  teamId: string;
  budgetRemaining: number;
  salaryCap?: number;
  currentSalary?: number;
  bandPriorities?: BandPriorities;
  roster: AuctionSimRosterEntry[];
  budgetAtRosterSpot11: number | null;
  completionSurplusAtRosterSpot11: number | null;
  qualityCompletionSurplusAtRosterSpot11: number | null;
}

export interface AuctionSimBidRead {
  teamId: string;
  rawWillingness: number;
  maxLegalBid: number;
  wtp: number;
  eligible: boolean;
  modelWarnings?: readonly string[];
  completionCost?: number;
  completionSurplus?: number;
  qualityCompletionCost?: number;
  qualityCompletionSurplus?: number;
  liquidityPenalty?: number;
  liquidityAudit?: AuctionSimLiquidityAuditRead;
  passLiquidityAudit?: AuctionSimLiquidityAuditRead;
  wtpReductionVsV1?: number;
  liquidityRosterSlotNumber?: number;
  utilityIfPass?: number;
  utilityIfWin?: number;
  passValue?: number;
  winValueAtWtp?: number;
}

export interface AuctionSimLiquidityAuditRead {
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape;
  liquidityPenalty: number;
  qualitySurplusShortfall: number;
  cashPaceShortfall: number;
  scarcityPenalty: number;
  openSlotPressure: number;
  rawShortfall: number;
  shapedShortfall: number;
  slotScheduleMultiplier: number;
  qualitySurplusShortfallZero: boolean;
  cashPaceShortfallZero: boolean;
  scarcityPenaltyZero: boolean;
  openSlotPressureZero: boolean;
  openSlotPressureSaturated: boolean;
  liquidityCapApplied: boolean;
  liquidityCapSaturated: boolean;
  qualityCapBinding: boolean;
  cashPaceCapBinding: boolean;
}

export interface AuctionSimPickLogEntry {
  nominationNumber: number;
  playerId: string;
  numericGrade: number | null;
  letterGrade?: string;
  grade?: string;
  gradeBand: AuctionSimGradeBand;
  roleBucket?: string;
  iv: number;
  reserve: number;
  winnerTeamId: string | null;
  price: number | null;
  disposition: 'sold' | 'unsold';
  teamBudgetsAfter: Record<string, number>;
  bids: readonly AuctionSimBidRead[];
}

export interface AuctionSimAutoFillLogEntry {
  teamId: string;
  playerId: string;
  numericGrade: number | null;
  letterGrade?: string;
  grade?: string;
  gradeBand: AuctionSimGradeBand;
  iv: number;
  price: number;
  affordable: boolean;
  feasibleCompletion: boolean;
}

export interface AuctionSimPoolMetrics {
  poolSize: number;
  numericGradeHistogram: readonly NumericGradeHistogramBin[];
  letterGradeSummary: Record<string, number>;
  missingNumericGradeCount: number;
  gradeBandCounts: Record<AuctionSimGradeBand, number>;
  medianIV: number;
  meanIV: number;
  medianNumericGrade: number | null;
  p10NumericGrade: number | null;
  p25NumericGrade: number | null;
  p75NumericGrade: number | null;
  p90NumericGrade: number | null;
  top22IVSum: number;
  top44IVSum: number;
  topRosterSizeIVSum: number;
  topRosterSizeIVSumToCap: number;
  highTailShare: number;
  middleMassShare: number;
  lowTailShare: number;
  distributionDistanceFromTarget: number;
  eliteShare: number;
  strongShare: number;
  coreShare: number;
  fillerShare: number;
  barbellIndex: number;
}

export interface AuctionSimRosterStrengthMetrics {
  rosterStrengthByTeam: Record<string, number>;
  meanRosterStrength: number;
  rosterStrengthSpread: number;
  eliteConcentration: number;
}

export interface AuctionSimEconomyDiagnostics {
  medianBudgetRemainingAtRosterSpot11Ratio: number | null;
  minBudgetRemainingAtRosterSpot11Ratio: number | null;
  maxBudgetRemainingAtRosterSpot11Ratio: number | null;
  medianCompletionSurplusAtRosterSpot11Ratio: number | null;
  minCompletionSurplusAtRosterSpot11Ratio: number | null;
  maxCompletionSurplusAtRosterSpot11Ratio: number | null;
  medianQualityCompletionSurplusAtRosterSpot11Ratio: number | null;
  minQualityCompletionSurplusAtRosterSpot11Ratio: number | null;
  maxQualityCompletionSurplusAtRosterSpot11Ratio: number | null;
  finalBudgetByTeam: Record<string, number>;
  finalCompletionSurplusByTeam: Record<string, number>;
  finalQualityCompletionSurplusByTeam: Record<string, number>;
  finalCashRemainingRatio: number | null;
  finalCompletionSurplusRatio: number | null;
  finalQualityCompletionSurplusRatio: number | null;
  autoFillCount: number;
  freeAutoFillCount: number;
  paidAutoFillCount: number;
  belowReserveSaleCount: number;
  middleClassBidRate: number | null;
  coreBidRate: number | null;
  invariantFailures: AuctionSimInvariantFailure[];
  observations: string[];
}

export interface AuctionSimResult {
  rosters: Record<string, AuctionSimRosterEntry[]>;
  budgetCurves: Record<string, readonly { rosterSize: number; budgetRemaining: number }[]>;
  pickLog: AuctionSimPickLogEntry[];
  autoFillLog: AuctionSimAutoFillLogEntry[];
  poolMetrics: AuctionSimPoolMetrics;
  rosterStrengthMetrics: AuctionSimRosterStrengthMetrics;
  economyDiagnostics: AuctionSimEconomyDiagnostics;
  profile: AuctionSimProfile;
}

export interface NumericGradeHistogramBin {
  minInclusive: number;
  maxExclusive: number;
  label: string;
  count: number;
  share: number;
}

export interface NumericGradeWindow {
  id: string;
  label: string;
  minInclusive: number;
  maxExclusive: number;
  targetShare: number;
}

export interface NumericGradeRead {
  numericGrade: number | null;
  letterGrade: string | null;
  source: 'smb4' | 'providedNumeric' | 'letterDisplayOnly' | 'missing';
}

export function normalizeAuctionSimConfig(config: Partial<AuctionSimConfig> = {}): AuctionSimConfig {
  return {
    ...DEFAULT_AUCTION_SIM_CONFIG,
    ...config,
  };
}

export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seededUnit(seed: string, key: string): number {
  return (hashString(`${seed}:${key}`) + 0.5) / 0x100000000;
}

export function teamBudgetSnapshot(teams: readonly AuctionSimTeamState[]): Record<string, number> {
  return Object.fromEntries(teams.map((team) => [team.teamId, team.budgetRemaining]));
}
