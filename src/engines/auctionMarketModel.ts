/**
 * The Second-Price auction market model — "what will he SELL for?" (FABLE-C2B; spec
 * SCOUTING_INTELLIGENCE_SPEC §5:125-175; audit AUC-1 confirmed zero market logic existed).
 *
 *   v_ij = IV_i × archetypeFit(i, team_j) × needMultiplier_j(pos_i) × personalityBias_j
 *   price_i ≈ 2nd-highest{ v_ij } + one increment          (clamped to each team's solvency)
 *
 * PRINCIPLES (all load-bearing, all from the spec/rulings):
 * - NEVER a point price — always a [low, median, high] band. Width carries the honest
 *   uncertainty: shill wildcards, unknowable human strategies, early-auction, thin pools.
 * - SHILLS ARE MODELED AS A DISTRIBUTION (JK 2026-07-01): the predictor never reads a shill's
 *   actual hidden archetype/personality — it prices the EXPECTED fit over the locked 24
 *   archetypes and feeds the mixture's spread into band width. Not a fixed extra-bidder term.
 * - PRIVACY BY CONSTRUCTION (spec §6): `EstimatedMarket` exposes counts and plain language only —
 *   never a rival's valuation number.
 * - SINGLE-MATH: fit pricing reuses `bandLiftFromPriorities`/`bandFitMultiplier` — the exact
 *   formula CPU bidders bid with — and solvency reuses the C2B completion floor via
 *   `sessionBidCeiling`. No second valuation model exists (FABLE-C3 depends on this one).
 * - CLOSED-FORM/DETERMINISTIC: no Monte-Carlo, no randomness; O(players × teams) with the
 *   24-archetype lift table precomputed once per call site. Sub-ms per projection.
 */

import { HISTORICAL_ARCHETYPES } from '../data/historicalArchetypes';
import { isCloser, type RosterSlotPlayer } from '../data/rosterConstruction';
import {
  BANDS,
  type Band,
  type BandPriorities,
} from './leagueConstruction';
import {
  lotOpeningAsk,
  sessionBidCeiling,
  type AuctionSession,
} from './auctionStateMachine';
import {
  CPU_SHILL_PERSONALITY_PROFILES,
  archetypeBandPriorities,
  bandFitMultiplier,
  bandLiftFromPriorities,
  type CpuShillAuctionPlayer,
  type CpuShillAuctionSession,
  type CpuShillPersonality,
} from './cpuShillBidding';
import {
  playerFillsHardRequirement,
  teamRosterNeed,
  type RosterNeedBreakdown,
  type RosterPositionMap,
} from './rosterNeed';

/**
 * §16 sim-tune: every market-model knob in one place. Calibrated against the FABLE-C2A harness
 * (`scripts/auctionTuningSim.test.ts` machinery) to the spec §5 gate: true clearing price inside
 * [low, high] ~85-90% of the time.
 */
export const MARKET_TUNING = {
  /**
   * The clearing-shrink model (probe-fit 2026-07-01 on the C2A sweep): a lot clears at
   * `ask + shrink × (secondPrice − ask)`. Because passes are permanent and the CPU interest
   * gates drop bidders out below their valuations, the shrink sits well under 1 and GROWS with
   * how many bid increments fit in the gap (finer walks get closer to true second price —
   * MLB ≈ 4-7 steps → median shrink ≈ 0.35; FARM ≈ 10-30 steps → ≈ 0.5).
   */
  shrinkBase: 0.28,
  shrinkStepWeight: 0.25,
  /** Steps (gap/increment) at which the shrink interpolation saturates. */
  stepNorm: 15,
  /** The band's HIGH edge as a shrink quantile: base + step term (+ uncertainty wideners). */
  highBase: 0.30,
  highStepWeight: 0.35,
  /** Absolute high cushion in bid increments (0: the harness/UI round-up is cushion enough). */
  highIncrementCushion: 0,
  /** Width added to the HIGH shrink per unit of shill fit-mixture σ over the 24 archetypes. */
  shillSigmaWeight: 0.9,
  /** Width added per bidder whose demand shape is UNKNOWN (human GMs; spec's band-wideners). */
  unknownBidderWeight: 0.02,
  /** Width added from early-auction pressure (open slots vs players left). */
  earlyAuctionWeight: 0.05,
  /** Interest gate: a team is a live suitor when v_ij clears this fraction of the opening ask. */
  interestAskFraction: 1.0,
  /** own_need: hard-requirement urgency weight (scaled by minimumAdditions/openSlots). */
  needWeight: 0.35,
  /** leagueScarcity clamp range around the neutral suitors-per-player ratio. */
  scarcityNeutralRatio: 0.5,
  scarcityMin: 0.85,
  scarcityMax: 1.25,
  /** CONTESTED: a rival is near-top when its valuation clears this fraction of the top v. */
  contestedNearTop: 0.92,
  /** Nomination-odds floor on the percentile weight (mirrors selectNextNominee). */
  nominationWeightFloor: 0.02,
} as const;

// ---------------------------------------------------------------------------------------------
// The three spec types (spec §5 staging: "Type the 3 undefined spec types").
// ---------------------------------------------------------------------------------------------

/** The predictor's view of ONE shill: a probability distribution over the locked 24 archetypes. */
export interface ShillProfile {
  teamId: string;
  /** Prior over archetype ids; v1 is uniform. MUST NOT be seeded from the shill's real secret. */
  archetypePrior: readonly { archetypeId: string; p: number }[];
}

/** The predictor's view of one competing (non-shill) team. Unknowns stay null → band wideners. */
export interface CompetingTeamProfile {
  teamId: string;
  kind: 'human' | 'cpu';
  /** Public demand shape (the team's league-setup archetype as band priorities); null = unknown. */
  bandPriorities: BandPriorities | null;
  /** Known bidding personality (CPU teams); null = unknown → neutral bias + width. */
  personality?: CpuShillPersonality | null;
}

export interface ContestedSignal {
  /** Rival teams (advised GM excluded) whose modeled valuation sits near the top of the market. */
  rivalCount: number;
  /** The plain-language cue (JK 2026-07-01) — counts only, never a rival's number. */
  message: string;
}

/**
 * The board's answer for one yet-to-be-sold player. Inference-only — privacy by construction.
 * NOTE (C2B-FIX F4, JK ruling 2026-07-02): the modeled second price is deliberately ABSENT from
 * this GM-facing shape (in a 1-rival market it can equal that rival's clamped ceiling 1:1, so no
 * future draft screen may ever display it). The calibration harness reads it via the separate
 * internal channel `estimateMarketWithInternals` below.
 */
export interface EstimatedMarket {
  playerId: string;
  band: { low: number; median: number; high: number };
  /** How many teams the model believes are live suitors at the opening ask. */
  interestedTeams: number;
  /** Set when 2+ rivals (excluding the advised GM) value this profile near the ceiling. */
  contested: ContestedSignal | null;
  /** True when the model expects NO suitor at the ask (a pass-out / forced-fill candidate). */
  likelyPass: boolean;
}

/**
 * INTERNAL / CALIBRATION-ONLY companion numbers (C2B-FIX F4). NEVER GM-facing: no draft screen,
 * advice panel, or UI adapter may consume this type — it exists solely so the tuning-harness
 * bridge (`scripts/marketModelPredictor.ts`) can inspect the model's clearing anchor.
 */
export interface MarketModelInternals {
  /**
   * The model's OWN estimate of the runner-up's drop level (the theoretical clearing anchor the
   * band shrinks from). Model inference, not any rival's actual number — walled off the GM-facing
   * type anyway because a 1-rival case can reproduce that rival's clamped ceiling exactly.
   */
  modeledSecondPrice: number;
}

// ---------------------------------------------------------------------------------------------
// The normalized lot view the pure core prices. Two builders exist: the session adapter below
// (live app, full information surface) and the harness adapter in `scripts/` (calibration).
// ---------------------------------------------------------------------------------------------

export interface MarketBidderView {
  teamId: string;
  kind: 'human' | 'cpu' | 'shill';
  slotsRemaining: number;
  /** The team's solvency ceiling for THIS lot (completion-based when the info exists). */
  maxBid: number;
  bandPriorities: BandPriorities | null;
  personality?: CpuShillPersonality | null;
  /** own_need × leagueScarcity for this player's position; 1 when position info is unknown. */
  needMultiplier: number;
  /** True when winning this player would strand the team (legality) — never a suitor. */
  wouldStrand: boolean;
}

export interface MarketLotView {
  playerId: string;
  iv: number;
  /** Normalized player band weights (archetype demand surface); null → fit 1 for everyone. */
  bandWeights: Record<Band, number> | null;
  openingAsk: number;
  bidIncrement: number;
  bidders: readonly MarketBidderView[];
  /** The GM being advised — excluded from the CONTESTED rival count; null = neutral observer. */
  advisedTeamId: string | null;
  openSlotsTotal: number;
  availablePlayerCount: number;
}

/** One precomputed per-archetype demand shape, shared across every lot of a call site. */
export interface ArchetypeLiftTable {
  entries: readonly { archetypeId: string; lift: Record<Band, number> }[];
}

export function buildArchetypeLiftTable(): ArchetypeLiftTable {
  return {
    entries: HISTORICAL_ARCHETYPES.map((arch) => ({
      archetypeId: arch.id,
      lift: bandLiftFromPriorities(archetypeBandPriorities(arch)),
    })),
  };
}

/** The v1 uniform shill prior over the locked 24 (JK ruling: distribution, never the secret). */
export function uniformShillPrior(teamId: string): ShillProfile {
  const p = 1 / HISTORICAL_ARCHETYPES.length;
  return {
    teamId,
    archetypePrior: HISTORICAL_ARCHETYPES.map((arch) => ({ archetypeId: arch.id, p })),
  };
}

/**
 * Demand shapes are static across lots, but `bandLiftFromPriorities` runs a full identity
 * composition (~0.1ms). Cache per priorities OBJECT so a 220-player board sweep pays each
 * bidder's composition once, not once per lot (the sub-ms hot-path requirement, spec §5:162).
 */
const BAND_LIFT_CACHE = new WeakMap<BandPriorities, Record<Band, number>>();

function cachedBandLift(priorities: BandPriorities): Record<Band, number> {
  const hit = BAND_LIFT_CACHE.get(priorities);
  if (hit !== undefined) return hit;
  const lift = bandLiftFromPriorities(priorities);
  BAND_LIFT_CACHE.set(priorities, lift);
  return lift;
}

const PERSONALITIES: readonly CpuShillPersonality[] = ['sniper', 'spender', 'zealot'];
const MEAN_PERSONALITY_BIAS =
  PERSONALITIES.reduce((sum, p) => sum + CPU_SHILL_PERSONALITY_PROFILES[p].personalityBias, 0) /
  PERSONALITIES.length;
const MEAN_PERSONALITY_SPREAD =
  PERSONALITIES.reduce((sum, p) => sum + CPU_SHILL_PERSONALITY_PROFILES[p].archetypeFitSpread, 0) /
  PERSONALITIES.length;

/** E[fit] and σ[fit] of a player against the 24-archetype mixture (uniform unless a prior says otherwise). */
export function shillFitMixture(
  bandWeights: Record<Band, number>,
  table: ArchetypeLiftTable,
  prior?: ShillProfile,
): { mean: number; sigma: number } {
  const weightById = prior
    ? new Map(prior.archetypePrior.map((entry) => [entry.archetypeId, entry.p]))
    : null;
  let mean = 0;
  let meanSq = 0;
  let totalP = 0;
  for (const entry of table.entries) {
    const p = weightById ? weightById.get(entry.archetypeId) ?? 0 : 1 / table.entries.length;
    if (p <= 0) continue;
    const fit = bandFitMultiplier(bandWeights, entry.lift, MEAN_PERSONALITY_SPREAD);
    mean += p * fit;
    meanSq += p * fit * fit;
    totalP += p;
  }
  if (totalP <= 0) return { mean: 1, sigma: 0 };
  mean /= totalP;
  meanSq /= totalP;
  return { mean, sigma: Math.sqrt(Math.max(0, meanSq - mean * mean)) };
}

interface BidderValuation {
  teamId: string;
  value: number;
  interested: boolean;
}

/**
 * The closed-form Second-Price estimate for one lot, WITH the internal calibration channel
 * (C2B-FIX F4). Pure; deterministic; O(bidders) once the archetype lift table is built.
 * GM-facing consumers must use `estimateMarket` (below) — this variant additionally returns
 * `MarketModelInternals` and is reserved for the tuning harness.
 */
export function estimateMarketWithInternals(
  view: MarketLotView,
  table: ArchetypeLiftTable,
): { market: EstimatedMarket; internals: MarketModelInternals } {
  const valuations: BidderValuation[] = [];
  let shillSigmaMax = 0;
  let unknownBidders = 0;

  for (const bidder of view.bidders) {
    if (bidder.slotsRemaining <= 0 || bidder.wouldStrand || bidder.maxBid <= 0) continue;

    let fit = 1;
    let bias: number;
    if (bidder.kind === 'shill') {
      if (view.bandWeights !== null) {
        const mixture = shillFitMixture(view.bandWeights, table);
        fit = mixture.mean;
        shillSigmaMax = Math.max(shillSigmaMax, mixture.sigma);
      } else {
        unknownBidders += 1;
      }
      bias = MEAN_PERSONALITY_BIAS;
    } else {
      if (view.bandWeights !== null && bidder.bandPriorities !== null) {
        const spread = bidder.personality
          ? CPU_SHILL_PERSONALITY_PROFILES[bidder.personality].archetypeFitSpread
          : MEAN_PERSONALITY_SPREAD;
        fit = bandFitMultiplier(view.bandWeights, cachedBandLift(bidder.bandPriorities), spread);
      } else if (view.bandWeights !== null) {
        unknownBidders += 1;
      }
      bias = bidder.personality
        ? CPU_SHILL_PERSONALITY_PROFILES[bidder.personality].personalityBias
        : 1;
      if (bidder.personality === null) unknownBidders += bidder.kind === 'human' ? 1 : 0;
    }

    const raw = view.iv * fit * bidder.needMultiplier * bias;
    const value = Math.min(raw, bidder.maxBid);
    valuations.push({
      teamId: bidder.teamId,
      value,
      interested: value >= view.openingAsk * MARKET_TUNING.interestAskFraction,
    });
  }

  const interested = valuations
    .filter((v) => v.interested)
    .sort((l, r) => r.value - l.value || l.teamId.localeCompare(r.teamId));

  // The theoretical clearing point: the runner-up's drop level (his clamped valuation).
  const secondPrice = interested.length >= 2 ? interested[1].value : view.openingAsk;
  const likelyPass = interested.length === 0;

  // The empirical shrink model (see MARKET_TUNING docs): no lot can clear below its ask (the
  // machine's minimum bid, lone-survivor claim, and forced fill are all exactly the ask), and
  // real clearings land a probe-fit fraction of the way from ask to second price.
  const gap = Math.max(0, secondPrice - view.openingAsk);
  const steps = view.bidIncrement > 0 ? gap / view.bidIncrement : 0;
  const stepFactor = Math.min(1, steps / MARKET_TUNING.stepNorm);
  const earlyPressure = view.availablePlayerCount > 0
    ? Math.min(1, view.openSlotsTotal / view.availablePlayerCount)
    : 0;
  const widen =
    MARKET_TUNING.shillSigmaWeight * shillSigmaMax +
    MARKET_TUNING.unknownBidderWeight * unknownBidders +
    MARKET_TUNING.earlyAuctionWeight * earlyPressure;

  const medianShrink = MARKET_TUNING.shrinkBase + MARKET_TUNING.shrinkStepWeight * stepFactor;
  const highShrink = MARKET_TUNING.highBase + MARKET_TUNING.highStepWeight * stepFactor + widen;

  const low = view.openingAsk;
  const median = view.openingAsk + medianShrink * gap;
  const high =
    view.openingAsk +
    highShrink * gap +
    MARKET_TUNING.highIncrementCushion * view.bidIncrement;

  // CONTESTED (audit AUC-6; JK 2026-07-01): rivals only, counts only, plain language only.
  const rivals = interested.filter((v) => v.teamId !== view.advisedTeamId);
  const top = interested[0]?.value ?? 0;
  const nearTop = rivals.filter((v) => top > 0 && v.value >= top * MARKET_TUNING.contestedNearTop);
  const contested: ContestedSignal | null = nearTop.length >= 2
    ? {
        rivalCount: nearTop.length,
        message: `${nearTop.length} other teams also want this profile — expect near-ceiling, or plan a fallback`,
      }
    : null;

  return {
    market: {
      playerId: view.playerId,
      band: { low, median: Math.min(Math.max(median, low), high), high },
      interestedTeams: interested.length,
      contested,
      likelyPass,
    },
    internals: { modeledSecondPrice: secondPrice },
  };
}

/** The GM-facing Second-Price estimate (the internal clearing anchor stripped — C2B-FIX F4). */
export function estimateMarket(view: MarketLotView, table: ArchetypeLiftTable): EstimatedMarket {
  return estimateMarketWithInternals(view, table).market;
}

// ---------------------------------------------------------------------------------------------
// needMultiplier = own_need × leagueScarcity (spec §5:132-136), built on rosterNeed's REAL model.
// ---------------------------------------------------------------------------------------------

/**
 * Does this player shape satisfy any of the team's outstanding hard requirements?
 *
 * CLASS-AWARE on the pitcher side (C2B-FIX F2): an arm fills the staff hard-requirement only when
 * adding it AS ITS ROLE strictly reduces the remaining arm minimum — a swing (SP/RP) always does
 * while `pitcherNeed > 0`; a pure SP only against a live rotation-class deficit; a pure RP/CP only
 * against a live bullpen-class deficit (see `RosterNeedBreakdown.rotationDeficit` docs for the
 * equivalence proof). The 8-body floor stays legitimately class-agnostic — any arm helps it.
 */
// The requirement predicate lives in rosterNeed.ts since FABLE-C3 (shared with the CPU bidder's
// need-aware endgame override); imported as `playerFillsHardRequirement` — same math, one home.
const fillsHardRequirement = playerFillsHardRequirement;

/**
 * own_need_j(pos_i): 1 for a merely-eligible player; scaled up when the player satisfies a hard
 * requirement, by how tight the team's remaining slots are against its remaining requirements.
 * (A player who would STRAND the roster is excluded upstream — the zero of this scale.)
 */
export function ownNeedMultiplier(
  need: RosterNeedBreakdown | null,
  shape: RosterSlotPlayer | null,
  openSlots: number,
): number {
  if (need === null || shape === null || openSlots <= 0) return 1;
  if (!fillsHardRequirement(shape, need)) return 1;
  const urgency = Math.min(1, need.minimumAdditions / openSlots);
  return 1 + MARKET_TUNING.needWeight * urgency;
}

export interface OwnValueInput {
  iv: number;
  archetypeWeights: Partial<Record<Band, number>> | undefined;
  ownBandPriorities: BandPriorities;
  needBreakdown: RosterNeedBreakdown | null;
  shape: RosterSlotPlayer | null;
  openSlots: number;
}

export interface OwnValueFactors {
  archetypeFitMultiplier: number;
  needMultiplier: number;
}

export function computeOwnValueFactors(input: Omit<OwnValueInput, 'iv'>): OwnValueFactors {
  const bandWeights = normalizeBandWeights(input.archetypeWeights);
  const fit = bandWeights !== null
    ? bandFitMultiplier(bandWeights, cachedBandLift(input.ownBandPriorities), MEAN_PERSONALITY_SPREAD)
    : 1;
  const need = ownNeedMultiplier(input.needBreakdown, input.shape, Math.max(1, input.openSlots));
  return {
    archetypeFitMultiplier: fit,
    needMultiplier: need,
  };
}

export function computeOwnValue(input: OwnValueInput): number {
  const factors = computeOwnValueFactors(input);
  return input.iv * factors.archetypeFitMultiplier * factors.needMultiplier;
}

/** leagueScarcity(pos) = teams-still-needing / players-left, normalized and clamped (spec §5:136). */
export function leagueScarcityMultiplier(teamsStillNeeding: number, playersLeftAtPos: number): number {
  if (playersLeftAtPos <= 0) return MARKET_TUNING.scarcityMax;
  const ratio = teamsStillNeeding / playersLeftAtPos;
  const normalized = ratio / MARKET_TUNING.scarcityNeutralRatio;
  return Math.min(MARKET_TUNING.scarcityMax, Math.max(MARKET_TUNING.scarcityMin, normalized));
}

function sameScarcityClass(left: RosterSlotPlayer, right: RosterSlotPlayer): boolean {
  if (isCloser(left)) return isCloser(right);
  if (left.isPitcher || right.isPitcher) {
    return left.isPitcher === right.isPitcher && left.role !== undefined && left.role === right.role;
  }
  return left.position === right.position;
}

// ---------------------------------------------------------------------------------------------
// Session adapter — the live app's full-information surface.
// ---------------------------------------------------------------------------------------------

export interface SessionMarketOptions {
  /** Which teams are shills (modeled distributionally). */
  shillTeamIds: ReadonlySet<string>;
  /** The GM being advised (excluded from CONTESTED). */
  advisedTeamId?: string | null;
  /** Public demand shapes per team (their league-setup archetype as band priorities). */
  bandPrioritiesByTeamId?: ReadonlyMap<string, BandPriorities>;
  /** Known CPU personalities per team (never shills' — theirs stay hidden). */
  personalityByTeamId?: ReadonlyMap<string, CpuShillPersonality>;
  /** Which non-shill teams are humans (their strategies stay private → wideners). */
  humanTeamIds?: ReadonlySet<string>;
}

function playerShape(session: AuctionSession, playerId: string): RosterSlotPlayer | null {
  return session.players[playerId]?.pos ?? null;
}

function teamPositionMap(session: AuctionSession, rosterIds: readonly string[]): RosterPositionMap | null {
  const map: Record<string, RosterSlotPlayer> = {};
  for (const id of rosterIds) {
    const shape = playerShape(session, id);
    if (!shape) return null;
    map[id] = shape;
  }
  return map;
}

/**
 * Build the normalized lot view for the CURRENT lot of a live session. Position-aware when the
 * pool is enriched (own_need + scarcity + completion ceilings); degrades honestly when not.
 */
export function buildLotViewFromSession(
  session: CpuShillAuctionSession,
  options: SessionMarketOptions,
): MarketLotView | null {
  const lot = session.currentLot;
  if (lot === null) return null;
  const player = session.players[lot.playerId] as CpuShillAuctionPlayer | undefined;
  if (player === undefined) return null;

  const candidateShape = playerShape(session, lot.playerId);

  // League scarcity for the candidate's exact primary position (null shape → neutral 1).
  let scarcity = 1;
  if (candidateShape !== null) {
    let playersLeftAtPos = 1; // the candidate himself
    for (const id of session.availablePlayerIds) {
      const shape = playerShape(session, id);
      if (shape !== null && sameScarcityClass(shape, candidateShape)) {
        playersLeftAtPos += 1;
      }
    }
    let teamsNeeding = 0;
    for (const team of session.teams) {
      if (team.rosterSlotsRemaining <= 0) continue;
      const positions = teamPositionMap(session, team.roster.map((a) => a.playerId));
      if (positions === null) continue;
      const need = teamRosterNeed(team.roster.map((a) => a.playerId), positions);
      if (need !== null && fillsHardRequirement(candidateShape, need)) teamsNeeding += 1;
    }
    scarcity = leagueScarcityMultiplier(teamsNeeding, playersLeftAtPos);
  }

  const bidders: MarketBidderView[] = session.teams
    .filter((team) => lot.stillIn.includes(team.teamId))
    .map((team) => {
      const isShill = options.shillTeamIds.has(team.teamId);
      const rosterIds = team.roster.map((a) => a.playerId);
      const positions = teamPositionMap(session, rosterIds);
      const need =
        positions !== null ? teamRosterNeed(rosterIds, positions) : null;
      const wouldStrand =
        positions !== null && candidateShape !== null
          ? (() => {
              const withCandidate: Record<string, RosterSlotPlayer> = {
                ...positions,
                [lot.playerId]: candidateShape,
              };
              const after = teamRosterNeed([...rosterIds, lot.playerId], withCandidate);
              return after === null
                ? false
                : after.infeasible || after.minimumAdditions > team.rosterSlotsRemaining - 1;
            })()
          : false;
      return {
        teamId: team.teamId,
        kind: isShill ? 'shill' as const : options.humanTeamIds?.has(team.teamId) ? 'human' as const : 'cpu' as const,
        slotsRemaining: team.rosterSlotsRemaining,
        maxBid: sessionBidCeiling(session, team.teamId) ?? 0,
        bandPriorities: isShill ? null : options.bandPrioritiesByTeamId?.get(team.teamId) ?? null,
        personality: isShill
          ? null
          : options.personalityByTeamId?.get(team.teamId)
            ?? (options.humanTeamIds?.has(team.teamId) ? null : undefined),
        needMultiplier: ownNeedMultiplier(need, candidateShape, team.rosterSlotsRemaining) * scarcity,
        wouldStrand,
      };
    });

  return {
    playerId: lot.playerId,
    iv: player.iv,
    bandWeights: normalizeBandWeights(player.archetypeWeights),
    openingAsk: lot.openingAsk,
    bidIncrement: session.config.bidIncrement,
    bidders,
    advisedTeamId: options.advisedTeamId ?? null,
    openSlotsTotal: session.teams.reduce((sum, team) => sum + Math.max(0, team.rosterSlotsRemaining), 0),
    availablePlayerCount: session.availablePlayerIds.length,
  };
}

function normalizeBandWeights(
  weights: Partial<Record<Band, number>> | undefined,
): Record<Band, number> | null {
  if (weights === undefined) return null;
  const normalized = Object.fromEntries(
    BANDS.map((band) => [band, Math.min(1, Math.max(0, weights[band] ?? 0))]),
  ) as Record<Band, number>;
  return BANDS.some((band) => normalized[band] > 0) ? normalized : null;
}

export function clubArchetypeFit(
  archetypeWeights: Partial<Record<Band, number>> | undefined,
  priorities: BandPriorities | null | undefined,
): number {
  if (!priorities) return 0;
  const bandWeights = normalizeBandWeights(archetypeWeights);
  if (bandWeights === null) return 0;
  return bandFitMultiplier(
    bandWeights,
    cachedBandLift(priorities),
    MEAN_PERSONALITY_SPREAD,
  );
}

// ---------------------------------------------------------------------------------------------
// Nomination-timing odds (spec §5:153-160) — the engine's weighted sampling is a KNOWN process.
// ---------------------------------------------------------------------------------------------

export interface NominationOdds {
  playerId: string;
  /** P(this player is the very next nominee). */
  pNext: number;
  /** P(nominated within the next `withinLots` lots) — documented without-replacement approximation. */
  pWithin: number;
}

/**
 * Closed-form nomination odds from `selectNextNominee`'s weighted-sampling law:
 * `w_i = max(pctile/100, 0.02)^E`. P(within k) uses the mean-weight depletion approximation
 * `1 − Π_{m<k} (1 − w_t / (ΣW − m·w̄))` — odds/ranges only, never "comes up in 6 picks".
 */
export function nominationOdds(
  targetPlayerIds: readonly string[],
  availablePlayers: readonly { playerId: string; ivPercentile: number }[],
  exponent: number,
  withinLots: number,
): NominationOdds[] {
  const weights = new Map<string, number>();
  let total = 0;
  for (const player of availablePlayers) {
    const pctile01 = Math.min(Math.max(player.ivPercentile / 100, 0), 1);
    const weight = Math.pow(Math.max(pctile01, MARKET_TUNING.nominationWeightFloor), exponent);
    weights.set(player.playerId, weight);
    total += weight;
  }
  const meanWeight = availablePlayers.length > 0 ? total / availablePlayers.length : 0;
  const horizon = Math.max(0, Math.min(withinLots, availablePlayers.length));

  return targetPlayerIds.map((playerId) => {
    const weight = weights.get(playerId);
    if (weight === undefined || total <= 0) {
      return { playerId, pNext: 0, pWithin: 0 };
    }
    let survive = 1;
    for (let m = 0; m < horizon; m += 1) {
      const remaining = total - m * meanWeight;
      if (remaining <= weight) {
        survive = 0;
        break;
      }
      survive *= 1 - weight / remaining;
    }
    return {
      playerId,
      pNext: weight / total,
      pWithin: Math.min(1, Math.max(0, 1 - survive)),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Bid-vs-pass — the killer feature's deterministic re-projection (spec §6:185-187, §5:162-164).
// ---------------------------------------------------------------------------------------------

export interface ProjectedTarget {
  playerId: string;
  /** The advised GM's own modeled valuation of this player. */
  ownValue: number;
  predictedMedian: number;
  /** ownValue − predictedMedian: the pivot signal (spec §5:137). */
  surplus: number;
  affordable: boolean;
}

export interface BoardProjection {
  branch: 'bid' | 'pass';
  budgetAfter: number;
  /** The team's remaining hard requirements on this branch (null without position info). */
  needAfter: RosterNeedBreakdown | null;
  /** Best remaining surplus targets on this branch, descending. */
  targets: readonly ProjectedTarget[];
}

export interface BidVsPassInput {
  session: CpuShillAuctionSession;
  options: SessionMarketOptions;
  teamId: string;
  /** The figure the GM is weighing ("if you BID at the selected figure…"). */
  bidAmount: number;
  /** The advised GM's own demand shape (they know their own archetype). */
  ownBandPriorities: BandPriorities;
  /** How many targets to surface per branch. */
  topN?: number;
}

/**
 * "If you BID → here's your board; if you PASS → here's your board." Deterministic recompute on
 * the live shrinking pool: one team's budget/roster toggled, everything re-priced closed-form.
 */
export function projectBidVsPass(input: BidVsPassInput): { bid: BoardProjection; pass: BoardProjection } | null {
  const { session, options, teamId, bidAmount } = input;
  const lot = session.currentLot;
  if (lot === null) return null;
  const team = session.teams.find((t) => t.teamId === teamId);
  if (team === undefined) return null;
  const candidateShape = playerShape(session, lot.playerId);
  const table = buildArchetypeLiftTable();
  const topN = input.topN ?? 8;

  const project = (branch: 'bid' | 'pass'): BoardProjection => {
    const won = branch === 'bid';
    const budgetAfter = won ? team.budgetRemaining - bidAmount : team.budgetRemaining;
    const rosterIds = team.roster.map((a) => a.playerId);
    const branchRosterIds = won ? [...rosterIds, lot.playerId] : rosterIds;
    const slotsAfter = won ? team.rosterSlotsRemaining - 1 : team.rosterSlotsRemaining;

    let needAfter: RosterNeedBreakdown | null = null;
    const positions = teamPositionMap(session, rosterIds);
    const branchPositions: RosterPositionMap | null =
      positions !== null && (!won || candidateShape !== null)
        ? won && candidateShape !== null
          ? { ...positions, [lot.playerId]: candidateShape }
          : positions
        : null;
    if (branchPositions !== null) {
      needAfter = teamRosterNeed(branchRosterIds, branchPositions);
    }

    const targets: ProjectedTarget[] = [];
    for (const playerId of session.availablePlayerIds) {
      const player = session.players[playerId] as CpuShillAuctionPlayer | undefined;
      if (player === undefined) continue;
      const bandWeights = normalizeBandWeights(player.archetypeWeights);
      const shape = playerShape(session, playerId);

      // C2B-FIX F3: never surface a target the advised GM could not LEGALLY sign on this branch —
      // the same per-bidder would-strand read `buildLotViewFromSession` applies (winning the
      // target consumes one more slot; the roster after it must still complete a legal 22).
      // Missing position info stays permissive, per the rosterNeed uncertainty policy.
      if (branchPositions !== null && shape !== null) {
        const afterTarget = teamRosterNeed(
          [...branchRosterIds, playerId],
          { ...branchPositions, [playerId]: shape },
        );
        const strandsRoster = afterTarget !== null &&
          (afterTarget.infeasible || afterTarget.minimumAdditions > slotsAfter - 1);
        if (strandsRoster) continue;
      }

      const ownValue = computeOwnValue({
        iv: player.iv,
        archetypeWeights: player.archetypeWeights,
        ownBandPriorities: input.ownBandPriorities,
        needBreakdown: needAfter,
        shape,
        openSlots: slotsAfter,
      });

      const rivalViews: MarketBidderView[] = session.teams
        .filter((t) => t.rosterSlotsRemaining > 0)
        .map((t) => {
          const isShill = options.shillTeamIds.has(t.teamId);
          const isSelf = t.teamId === teamId;
          const slots = isSelf ? slotsAfter : t.rosterSlotsRemaining;
          const budget = isSelf ? budgetAfter : t.budgetRemaining;
          return {
            teamId: t.teamId,
            kind: isShill ? 'shill' as const : options.humanTeamIds?.has(t.teamId) ? 'human' as const : 'cpu' as const,
            slotsRemaining: slots,
            maxBid: Math.max(0, Math.min(budget, sessionBidCeiling(session, t.teamId) ?? budget)),
            bandPriorities: isShill
              ? null
              : isSelf
                ? input.ownBandPriorities
                : options.bandPrioritiesByTeamId?.get(t.teamId) ?? null,
            personality: isShill
              ? null
              : options.personalityByTeamId?.get(t.teamId)
                ?? (options.humanTeamIds?.has(t.teamId) ? null : undefined),
            needMultiplier: 1,
            wouldStrand: false,
          };
        });
      const market = estimateMarket(
        {
          playerId,
          iv: player.iv,
          bandWeights,
          openingAsk: lotOpeningAsk(player, session.config),
          bidIncrement: session.config.bidIncrement,
          bidders: rivalViews,
          advisedTeamId: teamId,
          openSlotsTotal: session.teams.reduce((sum, t) => sum + Math.max(0, t.rosterSlotsRemaining), 0),
          availablePlayerCount: session.availablePlayerIds.length,
        },
        table,
      );
      targets.push({
        playerId,
        ownValue,
        predictedMedian: market.band.median,
        surplus: ownValue - market.band.median,
        affordable: market.band.median <= budgetAfter,
      });
    }
    targets.sort((l, r) => r.surplus - l.surplus || l.playerId.localeCompare(r.playerId));

    return { branch, budgetAfter, needAfter, targets: targets.slice(0, topN) };
  };

  return { bid: project('bid'), pass: project('pass') };
}
