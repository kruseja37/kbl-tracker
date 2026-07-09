import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';
import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  depthReport,
  isCloser,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import type { TaxonomyPosition } from '../data/playerArchetypeTaxonomy';
// COCKPIT WAVE 2 (Correction 5/7): the board's GM-order blend PORTS best22Target's tuned
// gmPreferenceWeight constant rather than inventing a second nudge magnitude (design doc §1.2 "no
// new math" + the contract's "reuse/port its constant" instruction). best22Target.ts itself is
// untouched — this is a read-only import of its existing tuning table.
import { BEST22_TUNING } from './best22Target';
import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import { TRAIT_PRICING } from '../data/traitPricing';
import {
  computeOwnValue,
  computeOwnValueFactors,
  estimateMarket,
  ownNeedMultiplier,
  type ArchetypeLiftTable,
  type EstimatedMarket,
  type MarketLotView,
} from './auctionMarketModel';
import type { Band, BandPriorities } from './leagueConstruction';
import {
  completionBidCeiling,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  depthAwareNeedNudge,
  rosterNeedBreakdown,
  wouldStrandRoster,
  type RosterNeedBreakdown,
  type RosterPositionMap,
} from './rosterNeed';
import { chemistryFitPriceMultiplier } from './chemistryFitValue';
import {
  chemistryAdviceForCandidate,
  chemistryProfileForPlayers,
} from '../utils/chemistryIntelligence';
import {
  evaluateLiquidityAwareBid,
  type LiquidityCompletionCandidate,
  type LiquidityPriceRead,
  type LiquidityReasonCode,
  type LiquidityState,
} from './liquidityAwareBidding';
import type { Player } from '../utils/leagueBuilderStorage';
import {
  identityEmbodiment,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import type { TierKey } from '../data/tierParams';
import type {
  ChemistryCrossing,
  ChemistryTipBreakdown,
  FamilyChemistryProfile,
} from './chemistryTierValue';

export type LightStatus = 'green' | 'amber' | 'red' | 'unknown';

export interface Light {
  status: LightStatus;
  sentence: string;
  detailKey?: string;
}

export interface FiveLights {
  shape: Light;
  /**
   * COCKPIT W1d (2026-07-08): optional because the farm scorecard (`assembleFarmWhisper`) omits
   * this entirely — farm has no identity-archetype model, and the design's honest-surface rule
   * (§1.4) says a dead "read coming" stub is deleted, not decorated. `assembleFiveLights` (MLB)
   * ALWAYS sets this; only the farm branch may omit it. WhisperPanel's farm light order never
   * asks for this key.
   */
  identity?: Light;
  /**
   * COCKPIT W1d (2026-07-08): optional for the same reason as `identity` above — farm has no
   * chemistry-SYNERGY model (the separate chemistry-FIT bridge, fork 3, folds into needMultiplier
   * instead and never populates this light).
   */
  chemistry?: Light;
  /**
   * COCKPIT W1a/b (2026-07-08): BALANCE is DELETED from the MLB cockpit (design doc §2 Tier 2 —
   * honest surfaces beat a dead "Balance read coming." stub) pending the Fable HANDEDNESS-SIGNAL
   * constants spec. The farm scorecard (COCKPIT W1d) never populates this either — farm renders
   * ONLY shape + budget. The MLB path (`assembleFiveLights`) never sets it; WhisperPanel's lights
   * row no longer reads it in either tier.
   */
  balance?: Light;
  budget: Light;
}

export interface MarketRead {
  playerId: string;
  band: EstimatedMarket['band'];
  interestedTeams: number;
  contested: EstimatedMarket['contested'];
  likelyPass: boolean;
}

/**
 * CALLFIX (2026-07-08) Item 1: THE LIVE CALL -- the single ladder every live-bid-aware display
 * (Tier-1 strip, headline, fine-print) reads from, so they can never disagree with each other.
 * 'lead' = the seat already holds the high bid; 'push'/'stretch'/'out' otherwise, per the ladder
 * in computeLiveCall below.
 */
export type LiveCallState = 'lead' | 'push' | 'stretch' | 'out';

export interface WorthToYou {
  iv: number;
  ownValue: number;
  archetypeFitMultiplier: number;
  needMultiplier: number;
  chemistryContribution: number;
  /** Absent when the seat has no chemistry-tier model for this read (e.g. the farm whisper
   * adapter, which does not model chemistry synergy) — omit the section rather than fake one. */
  chemistryReadout?: ChemistryReadout;
  verdict: 'push' | 'cap' | 'pass';
  /** CALLFIX Item 1: the live-bid-aware call -- what the display should say RIGHT NOW, given the
   * current live bid, not just the static reserve-price verdict above. */
  liveCall: LiveCallState;
  recommendedNumber: number;
  capValue: number | null;
  suggestedMaxBid: number;
  priceRead: LiquidityPriceRead;
  liquidityState: LiquidityState;
  discretionaryBudget: number;
  minimumFutureFillReserve: number;
  replacementValueEstimate: number;
  reasonCodes: readonly LiquidityReasonCode[];
}

export interface ChemistryReadoutFamily {
  family: ChemistryCode;
  word: string;
  count: number;
  tier: 'L1' | 'L2' | 'L3';
  distanceToNextTier: number | null;
  nextTierLabel: 'L2' | 'L3' | null;
  isCandidateFamily: boolean;
}

export interface ChemistryReadoutCandidate {
  family: ChemistryCode;
  word: string;
  countAfter: number;
  crossing: ChemistryCrossing | null;
  distanceToNextTierAfter: number | null;
}

export interface ChemistryReadout {
  families: ReadonlyArray<ChemistryReadoutFamily>;
  candidate: ChemistryReadoutCandidate;
}

export interface BoardEntry {
  playerId: string;
  worth: number;
  matchedShape: string | null;
  needTag: string | null;
  fitTag: 'IDENTITY' | null;
  note?: string;
  /**
   * COCKPIT WAVE 2: the candidate's canonical single position (RosterSlotPlayer.position — e.g.
   * 'SS', 'SP/RP'), when the candidate carried a `shape`. Populates the live board's PER-POSITION
   * grouping (Correction 5). Only the 12 TaxonomyPosition values are recognized groups; anything
   * else (legacy 'P'/'TWO-WAY' primaries, or candidates with no shape at all) is undefined here and
   * simply omitted from every per-position view while still appearing in the global board.
   */
  position?: string;
}

export interface RosterIntelligencePayload {
  seatTeamId: string;
  generatedAtLotIndex?: number;
  market?: MarketRead;
  worthToYou?: WorthToYou;
  board?: BoardEntry[];
  scorecard?: FiveLights;
}

/**
 * All C4 payload thresholds live here so Fable/Opus can retune without hunting through branch logic.
 */
export const PAYLOAD_TUNING = {
  /** PUSH requires the completion ceiling to clear the market median by 10%. */
  worthPushMedianMargin: 0.1,
  /** PASS when iv + chemistry premium is under 95% of the public market low edge. */
  worthPassLowBandFraction: 0.95,
  /** A candidate can push only when iv + chemistry premium reaches at least 95% of median. */
  worthMarketJustificationFraction: 0.95,
  /** Budget green means the ceiling still has two league-minimum salaries of insurance. */
  budgetInsuranceBuffer: LEAGUE_MINIMUM_SALARY * 2,
  /** Budget amber means the ceiling can at least reach the public median read. */
  budgetTightHeadroom: 0,
  /** Chemistry red requires exposed L1 negative traits to outnumber positive L2+ traits. */
  chemistryExposureOutweighsPositiveBy: 1,
  /** Identity provisional band cuts around existing identityEmbodiment boostZ. */
  identityGreenBoostZ: 0.35,
  identityAmberBoostZ: 0,
} as const;

export interface WorthToYouInput {
  candidate: Player;
  iv: number;
  rosterPlayers: readonly Player[];
  budgetRemaining: number;
  rosterWithCandidate: readonly RosterSlotPlayer[];
  remainingPool: readonly CompletionCandidate[];
  openSlotsAfterWin: number;
  nextBid?: number | null;
  currentBid?: number | null;
  bidIncrement?: number | null;
  /** CALLFIX Item 1: whether THIS seat already holds the current lot's high bid. Drives the
   * 'lead' rung of the live-call ladder -- the floor page resolves this by comparing the current
   * lot's high-bidder team id against this seat's team id. */
  seatIsHighBidder?: boolean;
  ownBandPriorities: BandPriorities;
  archetypeWeights: Partial<Record<Band, number>> | undefined;
  needBreakdown: RosterNeedBreakdown | null;
  candidateShape: RosterSlotPlayer | null;
  market?: MarketRead | null;
  /**
   * TAXTEETH (2026-07-08): the marginal luxury tax this specific candidate adds (the same
   * auctionMarginalTaxWithCaps figure TRUE COST displays), reserved out of the ceiling this feeds
   * (see fallbackLegalMax below) so worthToYou.suggestedMaxBid can never recommend a bid the
   * engine's tax-aware sessionBidCeiling would reject. Absent/0 is byte-identical to pre-TAXTEETH
   * behavior (the vast majority of teams, under the tax threshold).
   */
  marginalTax?: number | null;
}

export interface BoardCandidate {
  playerId: string;
  iv: number;
  candidate?: Player;
  chemistry?: ChemistryTipBreakdown;
  matchedShape?: string | null;
  shape?: RosterSlotPlayer;
  identityZ?: number;
  note?: string;
}

/**
 * COCKPIT WAVE 2 (Correction 5/7): the GM's own explicit board order — mirrors
 * `Team.boardRankOverrides` (leagueBuilderStorage.ts), which is the field's storage home. `global`
 * drives `assembleBoard`'s returned order; `byPosition` drives `sortBoardEntriesForPosition`'s
 * per-position 5-deep views. Both are a STRONG NUDGE blended with worth, never a hard override —
 * ruling 1 (ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md §1).
 */
export interface BoardRankOverrides {
  global?: readonly string[];
  byPosition?: Partial<Record<TaxonomyPosition, readonly string[]>>;
}

export interface BoardInput {
  candidates: readonly BoardCandidate[];
  rosterPlayers: readonly Player[];
  need?: RosterNeedBreakdown;
  /** Optional — omitted or absent-for-this-scope falls back to pure worth-ranked order. */
  rankOverrides?: BoardRankOverrides;
}

export interface ShapeLightInput {
  players: readonly RosterSlotPlayer[];
  rosterIds?: readonly string[];
  candidateId?: string;
  positionMap?: RosterPositionMap;
}

export interface BudgetLightInput {
  budgetRemaining: number;
  rosterWithCandidate: readonly RosterSlotPlayer[];
  remainingPool: readonly CompletionCandidate[];
  openSlotsAfterWin: number;
  market?: MarketRead | null;
  /**
   * F9 RULING (2026-07-08): the SAME liquidity-adjusted ceiling that drives the verdict and the
   * room-relation read (WorthToYou.suggestedMaxBid) — the ONE number every display read must
   * agree on. `null` when no liquidity read exists yet for this seat/lot (e.g. worthToYou could
   * not be assembled); the light renders 'unknown' rather than fabricate a status from the
   * unreserved completion ceiling.
   */
  liquidityMaxBid: number | null;
}

export interface IdentityLightInput {
  rosterPlayers: readonly SimPlayer[];
  archetype: SimArchetype;
  tier: TierKey;
  comparisonPool: readonly SimPlayer[];
}

export interface FiveLightsInput {
  shapePlayers: readonly RosterSlotPlayer[];
  chemistryPlayers: readonly Player[];
  shape?: Omit<ShapeLightInput, 'players'>;
  budget?: BudgetLightInput;
  identity?: IdentityLightInput;
}

export interface RosterIntelligencePayloadInput {
  seatTeamId: string;
  generatedAtLotIndex?: number;
  market?: MarketRead;
  worthToYou?: WorthToYou;
  board?: readonly BoardEntry[];
  scorecard?: FiveLights;
}

export function marketReadFromEstimate(view: MarketLotView, table: ArchetypeLiftTable): MarketRead {
  const market = estimateMarket(view, table);
  return {
    playerId: market.playerId,
    band: market.band,
    interestedTeams: market.interestedTeams,
    contested: market.contested,
    likelyPass: market.likelyPass,
  };
}

export function assembleWorthToYou(input: WorthToYouInput): WorthToYou {
  const chemistry = chemistryAdviceForCandidate(input.candidate, input.rosterPlayers);
  const chemistryReadout = buildChemistryReadout(
    chemistryProfileForPlayers(input.rosterPlayers),
    chemistry,
  );
  const factors = computeOwnValueFactors({
    archetypeWeights: input.archetypeWeights,
    ownBandPriorities: input.ownBandPriorities,
    needBreakdown: input.needBreakdown,
    shape: input.candidateShape,
    openSlots: input.openSlotsAfterWin,
  });
  const ownValue = computeOwnValue({
    iv: input.iv,
    archetypeWeights: input.archetypeWeights,
    ownBandPriorities: input.ownBandPriorities,
    needBreakdown: input.needBreakdown,
    shape: input.candidateShape,
    openSlots: input.openSlotsAfterWin,
  });
  const capValue = completionBidCeiling(
    input.budgetRemaining,
    input.rosterWithCandidate,
    input.remainingPool,
    input.openSlotsAfterWin,
  );
  const chemistryContribution = Math.max(0, chemistry.premium);
  const worth = ownValue + chemistryContribution;
  const uncappedLegalMax = capValue ?? (input.rosterWithCandidate.length >= LEGAL_ROSTER.size ? input.budgetRemaining : 0);
  // TAXTEETH (2026-07-08): reserve the marginal tax out of the ceiling BEFORE it becomes
  // legalMaxBid below, so suggestedMaxBid (F9's one ceiling) can never exceed what the team could
  // actually settle at. capValue itself is left untouched -- it keeps its own "Total Capacity"
  // (unreserved) display meaning (WhisperPanel.tsx F9 ruling comment).
  const fallbackLegalMax = Math.max(0, uncappedLegalMax - (input.marginalTax ?? 0));
  const resolvedNextBid = input.nextBid ?? input.market?.band.low ?? 0;
  const liquidity = evaluateLiquidityAwareBid({
    playerId: input.candidate.id,
    iv: input.iv,
    nextBid: resolvedNextBid,
    currentBid: input.currentBid,
    bidIncrement: input.bidIncrement ?? undefined,
    legalMaxBid: fallbackLegalMax,
    budgetRemaining: input.budgetRemaining,
    rosterSlotsRemaining: input.openSlotsAfterWin + 1,
    rosterShapes: input.rosterWithCandidate.slice(0, Math.max(0, input.rosterWithCandidate.length - 1)),
    candidateShape: input.candidateShape,
    remainingPool: input.remainingPool as readonly LiquidityCompletionCandidate[],
    baseValuation: factors.needMultiplier > 0 ? worth / factors.needMultiplier : worth,
    archetypeFitMultiplier: factors.archetypeFitMultiplier,
    needMultiplier: factors.needMultiplier,
    riskTolerance: 0.98,
  });
  const recommendedNumber = Math.max(0, Math.min(worth, liquidity.maxBid));
  const verdict = worthVerdict(worth, liquidity.maxBid, input.market ?? null);
  const liveCall = computeLiveCall({
    nextBid: resolvedNextBid,
    recommendedNumber,
    suggestedMaxBid: liquidity.maxBid,
    nextBidAllowed: liquidity.nextBidAllowed,
    strategicVerdict: verdict,
    seatIsHighBidder: input.seatIsHighBidder ?? false,
  });
  return {
    iv: input.iv,
    ownValue,
    archetypeFitMultiplier: factors.archetypeFitMultiplier,
    needMultiplier: factors.needMultiplier,
    chemistryContribution,
    chemistryReadout,
    verdict,
    liveCall,
    recommendedNumber,
    capValue,
    suggestedMaxBid: liquidity.maxBid,
    priceRead: liquidity.priceRead,
    liquidityState: liquidity.liquidityState,
    discretionaryBudget: liquidity.discretionaryBudget,
    minimumFutureFillReserve: liquidity.minimumFutureFillReserve,
    replacementValueEstimate: liquidity.replacementValueEstimate,
    reasonCodes: liquidity.reasonCodes,
  };
}

export function buildChemistryReadout(
  profile: readonly FamilyChemistryProfile[],
  chemistry: ChemistryTipBreakdown,
): ChemistryReadout {
  const byFamily = new Map(profile.map((row) => [row.family, row]));
  return {
    families: CHEMISTRY_CODES.map((family) => {
      const row = byFamily.get(family);
      const tier = row?.tier ?? 'L1';
      return {
        family,
        word: familyWord(family),
        count: row?.count ?? 0,
        tier,
        distanceToNextTier: row ? row.distanceToNextTier : 3,
        nextTierLabel: nextTierLabel(tier),
        isCandidateFamily: family === chemistry.family,
      };
    }),
    candidate: {
      family: chemistry.family,
      word: familyWord(chemistry.family),
      countAfter: chemistry.countsAfter[chemistry.family] ?? 0,
      crossing: chemistry.crossing,
      distanceToNextTierAfter: chemistry.distanceToNextTier,
    },
  };
}

/** Population std-dev, matching best22Target's local `meanStd` (that file is a forbidden edit
 * surface for this lane, so this is a small, faithful re-implementation, not new math). */
function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * COCKPIT WAVE 2 rank-blend (Correction 5/7): the GM's explicit order is a STRONG NUDGE on TOP of
 * worth, mirroring best22Target's `slotPreferenceBonus` gmPreferenceWeight term exactly —
 * `gmPreferenceWeight / (1 + rank)`, scaled by the pool's own spread (`u`/here `scale`) so the
 * nudge stays proportionate to how spread-out `worth` actually is for this candidate set (falls
 * back to 1 when the set has zero spread, same `|| 1` guard as best22Target). This only ever
 * changes SORT ORDER — the displayed `worth` number is untouched (F9 one-ceiling rule: no new
 * displayed number, only new ranking).
 */
function sortByGmBlend(entries: readonly BoardEntry[], orderedIds: readonly string[] | undefined): BoardEntry[] {
  const scale = standardDeviation(entries.map((entry) => entry.worth)) || 1;
  const rankBonus = (playerId: string): number => {
    if (!orderedIds?.length) return 0;
    const rank = orderedIds.indexOf(playerId);
    return rank >= 0 ? (BEST22_TUNING.gmPreferenceWeight / (1 + rank)) * scale : 0;
  };
  return [...entries].sort((a, b) =>
    Number(Boolean(b.needTag)) - Number(Boolean(a.needTag)) ||
    Number(Boolean(b.fitTag)) - Number(Boolean(a.fitTag)) ||
    (b.worth + rankBonus(b.playerId)) - (a.worth + rankBonus(a.playerId)) ||
    a.playerId.localeCompare(b.playerId),
  );
}

export function assembleBoard(input: BoardInput): BoardEntry[] {
  const entries = input.candidates.map((candidate) => {
    const chemistry = candidate.chemistry ??
      (candidate.candidate
        ? chemistryAdviceForCandidate(candidate.candidate, input.rosterPlayers)
        : null);
    return {
      playerId: candidate.playerId,
      worth: candidate.iv + (chemistry?.premium ?? 0),
      matchedShape: candidate.matchedShape ?? null,
      needTag: boardNeedTag(candidate.shape, input.need),
      fitTag: boardFitTag(candidate.identityZ),
      ...(candidate.shape?.position ? { position: candidate.shape.position } : {}),
      ...(candidate.note ? { note: candidate.note } : {}),
    };
  });
  return sortByGmBlend(entries, input.rankOverrides?.global);
}

const TAXONOMY_POSITIONS: readonly TaxonomyPosition[] =
  ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'];

/**
 * COCKPIT WAVE 2 (Correction 5): the per-position 5-deep view. Filters an already-assembled board
 * to one canonical TaxonomyPosition and re-sorts with THAT position's own rank-override list and
 * its own local worth spread (a position-scoped nudge, not the global one). Callers slice to 5 for
 * display; this returns the full filtered+sorted set so the page/panel controls the depth.
 */
export function sortBoardEntriesForPosition(
  entries: readonly BoardEntry[],
  position: TaxonomyPosition,
  rankOverrides?: BoardRankOverrides,
): BoardEntry[] {
  const positionEntries = entries.filter((entry) => entry.position === position);
  return sortByGmBlend(positionEntries, rankOverrides?.byPosition?.[position]);
}

/** The 12 canonical position groups the per-position board recognizes (8 field + SP/SP-RP/RP/CP). */
export function boardPositionGroups(): readonly TaxonomyPosition[] {
  return TAXONOMY_POSITIONS;
}

function boardNeedTag(shape: RosterSlotPlayer | undefined, need: RosterNeedBreakdown | undefined): string | null {
  if (!shape || !need) return null;
  const missingPrimary = need.missingPrimaries.find((pos) => shape.position === pos);
  if (missingPrimary) return `FILLS ${missingPrimary}`;
  if (need.catcherCoverNeed > 0 && canCover(shape, 'C')) return 'CATCHER COVER';
  if (shape.isPitcher && need.rotationDeficit > 0 && canStart(shape)) return 'ROTATION';
  if (shape.isPitcher && need.closerDeficit > 0 && isCloser(shape)) return 'CLOSER';
  if (shape.isPitcher && Math.max(0, need.bullpenDeficit - need.closerDeficit) > 0 && canRelieve(shape)) return 'BULLPEN';
  if (!shape.isPitcher && need.hitterFloorNeed > 0) return 'BENCH BAT';
  if (shape.isPitcher && need.pitcherFloorNeed > 0) return 'STAFF DEPTH';
  return null;
}

function boardFitTag(identityZ: number | undefined): BoardEntry['fitTag'] {
  return identityZ !== undefined && identityZ >= PAYLOAD_TUNING.identityGreenBoostZ ? 'IDENTITY' : null;
}

export function assembleFiveLights(input: FiveLightsInput): FiveLights {
  return {
    shape: shapeLight({
      players: input.shapePlayers,
      rosterIds: input.shape?.rosterIds,
      candidateId: input.shape?.candidateId,
      positionMap: input.shape?.positionMap,
    }),
    identity: identityLight(input.identity),
    chemistry: chemistryLight(input.chemistryPlayers),
    // COCKPIT W1a/b: BALANCE deleted, not stubbed (see FiveLights.balance doc comment).
    budget: input.budget ? budgetLight(input.budget) : unknownBudgetLight(),
  };
}

export function assembleRosterIntelligencePayload(
  input: RosterIntelligencePayloadInput,
): RosterIntelligencePayload {
  return {
    seatTeamId: input.seatTeamId,
    ...(input.generatedAtLotIndex !== undefined ? { generatedAtLotIndex: input.generatedAtLotIndex } : {}),
    ...(input.market ? { market: input.market } : {}),
    ...(input.worthToYou ? { worthToYou: input.worthToYou } : {}),
    ...(input.board ? { board: [...input.board] } : {}),
    ...(input.scorecard ? { scorecard: input.scorecard } : {}),
  };
}

/**
 * F9 RULING (2026-07-08): the SECOND parameter here is the liquidity-ADJUSTED ceiling
 * (WorthToYou.suggestedMaxBid) — every caller must pass the reserved number, never the
 * unreserved completion ceiling (WorthToYou.capValue), so the verdict agrees with every other
 * ceiling-driven display read (room-relation, budget light).
 */
function worthVerdict(
  contextualWorth: number,
  maxBid: number | null,
  market: MarketRead | null,
): WorthToYou['verdict'] {
  // Without a market read we cannot prove a bargain: no affordable ceiling passes, any positive
  // ceiling is a hard cap, and push remains reserved for market-justified bargains.
  if (maxBid === null) return 'pass';
  if (!market) return maxBid === null || maxBid <= 0 ? 'pass' : 'cap';

  if (maxBid < market.band.low) return 'pass';
  if (contextualWorth < market.band.low * PAYLOAD_TUNING.worthPassLowBandFraction) return 'pass';

  const comfortableCeiling = market.band.median * (1 + PAYLOAD_TUNING.worthPushMedianMargin);
  const justified = contextualWorth >= market.band.median * PAYLOAD_TUNING.worthMarketJustificationFraction;
  if (maxBid >= comfortableCeiling && justified) return 'push';

  return 'cap';
}

/**
 * CALLFIX (2026-07-08) Item 1: THE LIVE CALL -- ONE shared ladder for both the MLB and farm
 * whisper assemblies, so the Tier-1 strip, the shared headline, and the fine print can never
 * disagree with each other again (the exact bug JK caught live: the strip stayed frozen on a
 * static reserve-price verdict while the CURRENT bid moved past it within the same lot). First
 * match wins. Does NOT change worthVerdict itself -- 'pass' still forces 'out' here, same as
 * before, just alongside the new live-bid-aware rungs.
 */
function computeLiveCall(input: {
  nextBid: number;
  recommendedNumber: number;
  suggestedMaxBid: number;
  nextBidAllowed: boolean;
  strategicVerdict: WorthToYou['verdict'];
  seatIsHighBidder: boolean;
}): LiveCallState {
  if (input.seatIsHighBidder) return 'lead';
  if (input.strategicVerdict === 'pass' || !input.nextBidAllowed) return 'out';
  if (input.nextBid <= input.recommendedNumber) return 'push';
  if (input.nextBid <= input.suggestedMaxBid) return 'stretch';
  return 'out';
}

function shapeLight(input: ShapeLightInput): Light {
  const players = [...input.players];
  const need = rosterNeedBreakdown(players);
  const stranded = input.rosterIds && input.candidateId && input.positionMap
    ? wouldStrandRoster(input.rosterIds, input.candidateId, input.positionMap)
    : false;

  if (!isLegalRoster(players) || need.infeasible || stranded) {
    const gap = nearestShapeGap(need);
    return {
      status: 'red',
      sentence: stranded
        ? 'That move strands the roster before you can field a legal club.'
        : `${gap} is still short of a legal roster.`,
      detailKey: 'shape',
    };
  }

  const thin = depthReport(players).thinPositions;
  const exact = exactMinimumGap(players);
  if (exact || thin.length > 0) {
    const thinText = thin.length > 0 ? `${baseballList(thin)} is thin` : exact;
    return {
      status: 'amber',
      sentence: `${thinText}; one injury can turn this into a roster problem.`,
      detailKey: 'shape',
    };
  }

  return {
    status: 'green',
    sentence: 'This roster has legal starters, playable depth, and room for one bad break.',
    detailKey: 'shape',
  };
}

function nearestShapeGap(need: ReturnType<typeof rosterNeedBreakdown>): string {
  if (need.missingPrimaries.length > 0) return `${baseballList(need.missingPrimaries)} primary coverage`;
  if (need.catcherCoverNeed > 0) return 'backup catcher coverage';
  if (need.rotationDeficit > 0) return 'rotation depth';
  if (need.closerDeficit > 0) return 'closer depth';
  if (need.bullpenDeficit > 0) return 'bullpen depth';
  if (need.hitterFloorNeed > 0) return 'bench depth';
  if (need.pitcherFloorNeed > 0) return 'pitching depth';
  return 'Roster shape';
}

function exactMinimumGap(players: readonly RosterSlotPlayer[]): string | null {
  if (players.filter((p) => canCover(p, 'C')).length === LEGAL_ROSTER.minCatchers) {
    return 'catcher depth is exactly at the minimum';
  }
  if (players.filter(canStart).length === LEGAL_ROSTER.startingPitchers) {
    return 'rotation depth is exactly at the minimum';
  }
  if (players.filter(canRelieve).length === LEGAL_ROSTER.minRelievers) {
    return 'bullpen depth is exactly at the minimum';
  }
  return null;
}

function chemistryLight(players: readonly Player[]): Light {
  const profile = chemistryProfileForPlayers(players);
  const traitPressure = chemistryTraitPressure(players, profile);
  const opportunity = nearestChemistryOpportunity(profile);

  if (
    traitPressure.negativeL1 >=
    traitPressure.positiveL2Plus + PAYLOAD_TUNING.chemistryExposureOutweighsPositiveBy
  ) {
    return {
      status: 'red',
      sentence: `${traitPressure.negativeL1} negative traits are exposed at Level 1; ${opportunity}.`,
      detailKey: 'chemistry',
    };
  }

  if (!traitPressure.hasL2PlusFamily || traitPressure.negativeL1 > 0) {
    return {
      status: 'amber',
      sentence: `${opportunity}.`,
      detailKey: 'chemistry',
    };
  }

  return {
    status: 'green',
    sentence: `${opportunity}.`,
    detailKey: 'chemistry',
  };
}

function chemistryTraitPressure(
  players: readonly Player[],
  profile: readonly FamilyChemistryProfile[],
): { negativeL1: number; positiveL2Plus: number; hasL2PlusFamily: boolean } {
  const tierByFamily = new Map(profile.map((row) => [row.family, row.tier]));
  let negativeL1 = 0;
  let positiveL2Plus = 0;
  for (const player of players) {
    for (const traitName of [player.trait1, player.trait2]) {
      if (!traitName) continue;
      const priced = TRAIT_PRICING.find((entry) => entry.name === traitName);
      if (!priced) continue;
      const family = normalizeToChemistryCode(priced.chemistry);
      const tier = tierByFamily.get(family) ?? 'L1';
      if (priced.polarity === 'negative' && tier === 'L1') negativeL1 += 1;
      if (priced.polarity === 'positive' && tier !== 'L1') positiveL2Plus += 1;
    }
  }
  return {
    negativeL1,
    positiveL2Plus,
    hasL2PlusFamily: profile.some((row) => row.tier !== 'L1'),
  };
}

function nearestChemistryOpportunity(profile: readonly FamilyChemistryProfile[]): string {
  const reachable = profile
    .filter((row) => row.distanceToNextTier !== null)
    .sort((a, b) => (a.distanceToNextTier ?? 0) - (b.distanceToNextTier ?? 0) || a.family.localeCompare(b.family))[0];
  if (!reachable || reachable.distanceToNextTier === null) {
    return 'Every chemistry family is already at its top trait tier';
  }
  const familyName = familyWord(reachable.family);
  const noun = reachable.distanceToNextTier === 1 ? 'bat' : 'bats';
  const verb = reachable.distanceToNextTier === 1 ? 'puts' : 'put';
  const target = reachable.tier === 'L1' ? 'doubles' : 'triples';
  return `${reachable.distanceToNextTier} more ${familyName} ${noun} ${verb} ${familyName} traits at the ${target} tier`;
}

/**
 * F9 RULING (2026-07-08): shared by the MLB budget light and the farm whisper's budget read so
 * both agree with the verdict/room-relation reads on the SAME liquidity-adjusted ceiling. Pure
 * headroom classification only — callers own sourcing the ceiling honestly.
 */
function budgetStatusFromHeadroom(headroom: number): Light {
  if (headroom >= PAYLOAD_TUNING.budgetInsuranceBuffer) {
    return {
      status: 'green',
      sentence: 'You can meet this price and still insure the finish.',
      detailKey: 'budget',
    };
  }
  if (headroom >= PAYLOAD_TUNING.budgetTightHeadroom) {
    return {
      status: 'amber',
      sentence: 'You can meet the median read, but the finish gets tight.',
      detailKey: 'budget',
    };
  }
  return {
    status: 'red',
    sentence: 'The median read traps the rest of the roster.',
    detailKey: 'budget',
  };
}

function budgetLight(input: BudgetLightInput): Light {
  // Infeasibility is a distinct, roster-legality question (can the roster be completed AT ALL
  // from what's left) — independent of which ceiling number prices the headroom, so this stays
  // sourced from the verified completion quote regardless of the F9 fix below.
  const completionCeiling = completionBidCeiling(
    input.budgetRemaining,
    input.rosterWithCandidate,
    input.remainingPool,
    input.openSlotsAfterWin,
  );
  if (completionCeiling === null) {
    return {
      status: 'red',
      sentence: 'The finish quote is infeasible from the players left.',
      detailKey: 'budget',
    };
  }
  // F9 FIX: headroom is priced off the liquidity-adjusted ceiling (the SAME number driving the
  // verdict and room-relation), not the unreserved completion ceiling above — otherwise this
  // light can read green while the verdict says pass.
  if (input.liquidityMaxBid === null) return unknownBudgetLight();
  const target = input.market?.band.median ?? 0;
  return budgetStatusFromHeadroom(input.liquidityMaxBid - target);
}

function unknownBudgetLight(): Light {
  return {
    status: 'unknown',
    sentence: 'Budget read needs a completion quote.',
    detailKey: 'budget',
  };
}

function identityLight(input: IdentityLightInput | undefined): Light {
  if (!input) {
    // TODO(IDENTITY): wire the caller's chosen archetype + comparison pool when C4-B/C4-C pass it.
    return { status: 'unknown', sentence: 'Identity read coming.' };
  }

  const report = identityEmbodiment(
    [...input.rosterPlayers],
    input.archetype,
    input.tier,
    [...input.comparisonPool],
  );
  if (report.boostZ >= PAYLOAD_TUNING.identityGreenBoostZ) {
    return {
      status: 'green',
      sentence: 'This roster is visibly leaning into the chosen identity.',
      detailKey: 'identity',
    };
  }
  if (report.boostZ >= PAYLOAD_TUNING.identityAmberBoostZ) {
    return {
      status: 'amber',
      sentence: 'This roster is close to the chosen identity, but the edge is thin.',
      detailKey: 'identity',
    };
  }
  return {
    status: 'red',
    sentence: 'This roster is drifting away from the chosen identity.',
    detailKey: 'identity',
  };
}

function baseballList(items: readonly FieldPosition[]): string {
  if (items.length === 0) return 'Roster';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function nextTierLabel(tier: 'L1' | 'L2' | 'L3'): ChemistryReadoutFamily['nextTierLabel'] {
  if (tier === 'L1') return 'L2';
  if (tier === 'L2') return 'L3';
  return null;
}

function familyWord(family: ChemistryCode): string {
  return CHEMISTRY_CODE_TO_WORD[family];
}

// ---------------------------------------------------------------------------------------------
// FARM WHISPER (P4, 2026-07-08; MLB BRIDGE added COCKPIT W1d, 2026-07-08): a branch beside the
// MLB payload builder above, NOT a new engine. The farm auction has no legal-roster-shape model of
// its own (RosterSlotPlayer/LEGAL_ROSTER are MLB-only), so this still cannot call
// assembleWorthToYou/assembleFiveLights directly — but per DRAFT_COCKPIT_DESIGN_2026-07-08.md §2.5
// (JK directive at ratification), the farm Asst GM's whole job is bridging the MLB roster to the
// farm board: "who should we go after given who we have sitting in front of them at the MLB
// level." This branch now reads the seat's ALREADY-COMPLETE MLB roster (mapped to the SAME
// RosterSlotPlayer legality shape via rosterNeed.ts's toRosterSlotPlayer) to drive need + depth +
// the SHAPE light — it still feeds the SAME untouched liquidityAwareBidding engine + the SAME
// worthVerdict/budgetStatusFromHeadroom helpers, with farm-appropriate inputs (the archetype scout
// band as the market read, farm budget/roster slots as the liquidity inputs). Identity and
// chemistry-SYNERGY still have no farm data source, so those two are DELETED from the farm
// scorecard entirely (not stubbed) — only SHAPE and BUDGET render on farm (WhisperPanel's farm
// light order never asks for the other two). FOG LAW: none of this sharpens farm scout fog — the
// valuation still prices off the scouted band (input.band), never a true IV.
// ---------------------------------------------------------------------------------------------

export interface FarmWhisperBand {
  low: number;
  high: number;
  displayedEstimate: number;
}

/**
 * COCKPIT W1d fork 3 (RESOLVED YES, dark-first, 2026-07-08 — DRAFT_COCKPIT_DESIGN_2026-07-08.md
 * §4 fork 3): OFF by default. When true, the chemistry-fit read (i) folds into the SAME
 * needMultiplier composition below (one ceiling, no new composition rule) and (ii) a Tier-2 chip
 * label is produced; while false, farmChemFitMultiplier/farmChemFitLabel are no-ops and output is
 * byte-identical to the pre-W1d shape. Flip only after a JK feel-pass on the farm floor.
 */
const FARM_CHEM_FIT_ENABLED = false;

export interface FarmWhisperInput {
  candidateId: string;
  /** The scout archetype band for this lot (SCOUTING_INTELLIGENCE_SPEC / farmArchetypeTilt) —
   * the farm's only market-read analogue; there is no rival-demand simulation for farm lots. */
  band: FarmWhisperBand;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary: number;
  nextBid: number;
  currentBid: number | null;
  bidIncrement?: number;
  /**
   * COCKPIT W1d: the seat's MLB roster, mapped through toRosterSlotPlayer (rosterNeed.ts:48) to
   * the SAME legality shape rosterNeedBreakdown/depthReport expect. Empty when the MLB roster
   * can't be resolved — permissive fallback (neutral need, SHAPE stays an honest 'unknown' stub),
   * never a fabricated read (design principle 4).
   */
  mlbRosterShapes: readonly RosterSlotPlayer[];
  /**
   * COCKPIT W1d: the farm prospect on the block, mapped to the SAME legality shape an MLB roster
   * slot would carry — used ONLY to test which MLB hard requirement / depth class it would
   * address if it were an MLB player; the prospect itself is never added to any roster (fog law:
   * this is reasoning THROUGH the fog, not sharpening it). Null when unresolvable.
   */
  candidateShape: RosterSlotPlayer | null;
  /** COCKPIT W1d fork 3 (dark-first): the prospect's own chemistry code/word. */
  prospectChemistry?: string | null;
  /** COCKPIT W1d fork 3 (dark-first): the MLB roster's chemistry-family counts — already
   * computed, never read until now (useFarmAuctionDraft.ts:206-230). */
  mlbRosterChemistryCounts?: Partial<Record<ChemistryCode, number>>;
  /** CALLFIX Item 1: whether THIS seat already holds the current lot's high bid -- same 'lead'
   * rung as the MLB ladder. */
  seatIsHighBidder?: boolean;
}

export interface FarmWhisperAssembly {
  market: MarketRead;
  worth: WorthToYou;
  scorecard: FiveLights;
  /** COCKPIT W1d fork 3 (dark-first): a Tier-2 chip label ("Chem fit +8% — Spirited room"). Only
   * ever non-null when FARM_CHEM_FIT_ENABLED is true AND the fit produces a positive bump. */
  chemFitLabel: string | null;
}

const FARM_UNMODELED_LIGHT = (sentence: string): Light => ({ status: 'unknown', sentence });

/**
 * SIM-TUNE (JK-tunable; dated 2026-07-08, COCKPIT W1d). Clamp bounds for the farm need-multiplier
 * composition below, mirroring priorityNeedModifier's OWN bounds discipline exactly
 * (liquidityAwareBidding.ts:81 — clamp(needMultiplier, 0.85, 1.35)). One ceiling, one clamp: the
 * composed multiplier still flows through evaluateLiquidityAwareBid's own identical clamp, so this
 * is belt-and-suspenders on the SAME bound, not a second rule.
 */
const FARM_NEED_MULTIPLIER_MIN = 0.85;
const FARM_NEED_MULTIPLIER_MAX = 1.35;

function clampFarmNeedMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(FARM_NEED_MULTIPLIER_MAX, Math.max(FARM_NEED_MULTIPLIER_MIN, value));
}

/**
 * The flag-INDEPENDENT chem-fit math (COCKPIT W1d fork 3) — kept separate from the
 * FARM_CHEM_FIT_ENABLED gate below so it stays directly unit-testable in isolation (proving the
 * math is correct and ready) without needing to flip the module constant. `assembleFarmWhisper`
 * is the ONLY caller gated by the flag.
 */
export function computeFarmChemFitLabel(
  prospectChemistry: string | null | undefined,
  rosterChemistryCounts: Partial<Record<ChemistryCode, number>> | null | undefined,
): string | null {
  if (!prospectChemistry || !rosterChemistryCounts) return null;
  const multiplier = chemistryFitPriceMultiplier(prospectChemistry, rosterChemistryCounts);
  const bumpPct = Math.round((multiplier - 1) * 100);
  if (bumpPct <= 0) return null;
  const word = familyWord(normalizeToChemistryCode(prospectChemistry));
  return `Chem fit +${bumpPct}% — ${word} room`;
}

function farmChemFitMultiplier(input: FarmWhisperInput): number {
  if (!FARM_CHEM_FIT_ENABLED || !input.prospectChemistry || !input.mlbRosterChemistryCounts) return 1;
  return chemistryFitPriceMultiplier(input.prospectChemistry, input.mlbRosterChemistryCounts);
}

function farmChemFitLabel(input: FarmWhisperInput): string | null {
  if (!FARM_CHEM_FIT_ENABLED) return null;
  return computeFarmChemFitLabel(input.prospectChemistry, input.mlbRosterChemistryCounts);
}

export function assembleFarmWhisper(input: FarmWhisperInput): FarmWhisperAssembly {
  const hasMlbRoster = input.mlbRosterShapes.length > 0;
  const mlbNeed = hasMlbRoster ? rosterNeedBreakdown([...input.mlbRosterShapes]) : null;
  // openSlots for ownNeedMultiplier: the MLB roster is a closed book by farm-auction time (no more
  // MLB slots open THIS draft), so urgency is binary — any live hard deficit saturates it to 1
  // (Math.max(1, minimumAdditions) makes min(1, minimumAdditions/openSlots) = 1 whenever a
  // deficit exists, matching the ownNeedMultiplier contract without inventing a fake slot count).
  const own = ownNeedMultiplier(mlbNeed, input.candidateShape, mlbNeed ? Math.max(1, mlbNeed.minimumAdditions) : 1);
  const depthNudge = hasMlbRoster && input.candidateShape
    ? depthAwareNeedNudge(input.mlbRosterShapes, input.candidateShape)
    : 1;
  const chemFit = farmChemFitMultiplier(input);
  const needMultiplier = clampFarmNeedMultiplier(own * depthNudge * chemFit);

  const iv = input.band.displayedEstimate;
  const ownValue = iv * needMultiplier;
  const worth = ownValue; // no chemistry-PREMIUM (synergy) modeled for farm lots yet — only fit

  const market: MarketRead = {
    playerId: input.candidateId,
    band: { low: input.band.low, median: input.band.displayedEstimate, high: input.band.high },
    // Farm has no rival-demand simulation (auctionMarketModel is MLB-only) — these three are
    // inert placeholders; WhisperPanel never reads them (only market.band is consumed).
    interestedTeams: 0,
    contested: null,
    likelyPass: false,
  };

  const liquidity = evaluateLiquidityAwareBid({
    playerId: input.candidateId,
    iv,
    nextBid: input.nextBid,
    currentBid: input.currentBid,
    bidIncrement: input.bidIncrement,
    legalMaxBid: null,
    budgetRemaining: input.budgetRemaining,
    rosterSlotsRemaining: input.rosterSlotsRemaining,
    minSalary: input.minSalary,
    baseValuation: iv,
    needMultiplier,
    riskTolerance: 1,
  });

  const verdict = worthVerdict(worth, liquidity.maxBid, market);
  const recommendedNumber = Math.max(0, Math.min(worth, liquidity.maxBid));
  const liveCall = computeLiveCall({
    nextBid: input.nextBid,
    recommendedNumber,
    suggestedMaxBid: liquidity.maxBid,
    nextBidAllowed: liquidity.nextBidAllowed,
    strategicVerdict: verdict,
    seatIsHighBidder: input.seatIsHighBidder ?? false,
  });

  const worthToYou: WorthToYou = {
    iv,
    ownValue,
    archetypeFitMultiplier: 1,
    needMultiplier,
    chemistryContribution: 0,
    verdict,
    liveCall,
    recommendedNumber,
    // "Total capacity" (F9 ruling): the farm has no verified completion-cost engine, so this is
    // honestly the raw remaining budget, not a completion-verified number — WhisperPanel labels
    // it distinctly and never uses it to drive the verdict/room-relation/budget reads.
    capValue: input.budgetRemaining,
    suggestedMaxBid: liquidity.maxBid,
    priceRead: liquidity.priceRead,
    liquidityState: liquidity.liquidityState,
    discretionaryBudget: liquidity.discretionaryBudget,
    minimumFutureFillReserve: liquidity.minimumFutureFillReserve,
    replacementValueEstimate: liquidity.replacementValueEstimate,
    reasonCodes: liquidity.reasonCodes,
  };

  // SHAPE un-stubs for free once the MLB roster is resolvable (§2.5 ground truth) — reuses the
  // SAME shapeLight() the MLB cockpit uses, fed the seat's MLB roster read-only (no strand-check:
  // a farm prospect never joins the MLB roster directly, so there is nothing to strand). Identity
  // and chemistry-synergy have no farm data source and are DELETED, not stubbed.
  const shape = hasMlbRoster
    ? shapeLight({ players: [...input.mlbRosterShapes] })
    : FARM_UNMODELED_LIGHT('Farm roster-shape read coming.');

  const scorecard: FiveLights = {
    shape,
    budget: budgetStatusFromHeadroom(liquidity.maxBid - market.band.median),
  };

  return { market, worth: worthToYou, scorecard, chemFitLabel: farmChemFitLabel(input) };
}
