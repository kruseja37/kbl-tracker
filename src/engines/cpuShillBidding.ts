import {
  HISTORICAL_ARCHETYPES,
  archetypeCapShift,
  type HistoricalArchetype,
} from '../data/historicalArchetypes';
import {
  BANDS,
  BAND_STATS,
  composeIdentity,
  identityCapShift,
  luxKeyToModStat,
  type Band,
  type BandPriorities,
} from './leagueConstruction';
import {
  servesOwnTightClass,
  sessionBidCeiling,
  wouldStarveJointDemand,
  type AuctionPlayer,
  type AuctionSession,
} from './auctionStateMachine';
import { playerFillsHardRequirement, teamRosterNeed } from './rosterNeed';

export type CpuShillPersonality = 'sniper' | 'spender' | 'zealot';

const CPU_SHILL_PERSONALITIES: readonly CpuShillPersonality[] = ['sniper', 'spender', 'zealot'];

export interface CpuShillProfile {
  teamId: string;
  personality: CpuShillPersonality;
  bandPriorities: BandPriorities;
  /**
   * The shill's own HIDDEN team archetype (one of the locked 24; FABLE-C2B, audit AUC-5 / spec
   * §6:195-197). Its bandPriorities are derived from this archetype. NEVER surfaced to a GM and
   * never read by the market predictor — the predictor models shills as a distribution over the
   * 24 (JK ruling 2026-07-01). Optional/additive on persisted sessions.
   */
  archetypeId?: string;
  /**
   * FABLE-C3 aggression cap: a shill stops bidding once it has won this many players. Uncapped
   * (absent) shills empirically hoard ~a full roster (~21 wins) under the end-checkpoint — the
   * cap keeps them price-pressure, not a competing franchise. Additive/optional.
   */
  shillMaxWins?: number;
  personalityBias?: number;
  interestAggression?: number;
  maxInterestProbability?: number;
}

export interface CpuShillAuctionPlayer extends AuctionPlayer {
  archetypeWeights?: Partial<Record<Band, number>>;
}

export interface CpuShillAuctionSession extends AuctionSession {
  cpuShills?: Readonly<Record<string, CpuShillProfile>>;
}

export interface CpuInterestLot {
  playerId: string;
  currentAsk: number;
  valuation: number;
  maxBid: number;
  budgetRemaining?: number;
  rosterSlotsRemaining?: number;
}

export type CpuBidPassReason =
  | 'already-high-bidder'
  | 'missing-lot'
  | 'no-interest'
  | 'not-open-bidding'
  | 'over-budget'
  | 'over-valuation'
  | 'team-full'
  | 'team-not-found'
  | 'team-not-in-lot'
  | 'unknown-player';

export type CpuBidOnLotDecision =
  | {
      kind: 'bid';
      teamId: string;
      playerId: string;
      bid: number;
      minimumBid: number;
      maxBid: number;
      valuation: number;
      personality: CpuShillPersonality;
    }
  | {
      kind: 'pass';
      teamId: string;
      playerId: string | null;
      reason: CpuBidPassReason;
      minimumBid: number | null;
      maxBid: number | null;
      valuation: number | null;
      personality: CpuShillPersonality | null;
    };

export type CpuLoneSurvivorDecision =
  | {
      kind: 'claim';
      teamId: string;
      playerId: string;
      price: number;
      valuation: number;
      maxBid: number;
    }
  | {
      kind: 'pass';
      teamId: string;
      playerId: string | null;
      reason:
        | 'not-resolve'
        | 'no-pending-claim'
        | 'not-this-team'
        | 'team-full'
        | 'over-budget'
        | 'over-valuation'
        | 'unknown-player';
      valuation: number | null;
      maxBid: number | null;
    };
type CpuLoneSurvivorPassReason = Extract<CpuLoneSurvivorDecision, { kind: 'pass' }>['reason'];

interface ResolvedCpuShillProfile extends CpuShillProfile {
  personalityBias: number;
  interestAggression: number;
  maxInterestProbability: number;
}

const SHILL_NOISE_SPREAD = 0.12;
const NO_FLOOR_MAX_INTEREST_PROBABILITY = 0.92;

// IV_ENGINE D14 leaves these profiles for sim-tune. These conservative defaults keep
// every interest probability below 1.0 so shills can never become a hidden floor.
export const CPU_SHILL_PERSONALITY_PROFILES: Record<
  CpuShillPersonality,
  {
    personalityBias: number;
    interestAggression: number;
    maxInterestProbability: number;
    nominationValueWeight: number;
    nominationBargainWeight: number;
    nominationDrainWeight: number;
    archetypeFitSpread: number;
  }
> = {
  sniper: {
    personalityBias: 0.98,
    interestAggression: 0.82,
    maxInterestProbability: 0.74,
    nominationValueWeight: 0.55,
    nominationBargainWeight: 0.35,
    nominationDrainWeight: 0.10,
    archetypeFitSpread: 0.18,
  },
  spender: {
    personalityBias: 1.08,
    interestAggression: 1.15,
    maxInterestProbability: 0.88,
    nominationValueWeight: 0.44,
    nominationBargainWeight: 0.14,
    nominationDrainWeight: 0.42,
    archetypeFitSpread: 0.22,
  },
  zealot: {
    personalityBias: 1.02,
    interestAggression: 0.96,
    maxInterestProbability: 0.82,
    nominationValueWeight: 0.72,
    nominationBargainWeight: 0.18,
    nominationDrainWeight: 0.10,
    archetypeFitSpread: 0.30,
  },
};

export function evaluateCpuValuation(
  player: CpuShillAuctionPlayer,
  shill: CpuShillProfile,
  seed: string,
): number {
  if (!Number.isFinite(player.iv) || player.iv <= 0) return 0;

  const resolved = resolveShillProfile(shill, seed);
  const archetypeFit = evaluateCpuArchetypeFit(player, resolved);
  const noise = shillNoiseMultiplier(`${seed}:${resolved.teamId}:${player.playerId}:valuation`);

  return player.iv * archetypeFit * resolved.personalityBias * noise;
}

/**
 * A band-priority vector's positive cap lift per band — the demand-shape core of the CPU fit
 * math, exported (FABLE-C2B) so the market predictor prices demand with EXACTLY the formula the
 * CPU bids with (single-math rule).
 */
export function bandLiftFromPriorities(priorities: BandPriorities): Record<Band, number> {
  const identity = composeIdentity(normalizeBandPriorities(priorities));
  const capShift = identityCapShift(identity);
  return Object.fromEntries(
    BANDS.map((band) => [
      band,
      BAND_STATS[band].reduce((sum, stat) => sum + Math.max(0, capShift[stat]), 0),
    ]),
  ) as Record<Band, number>;
}

/**
 * The fit multiplier a demand shape (band lift) assigns a player's band weights, centered on 1
 * with the personality's spread. Exported for the market predictor (single-math with CPU bids).
 */
export function bandFitMultiplier(
  playerWeights: Record<Band, number>,
  bandLift: Record<Band, number>,
  spread: number,
): number {
  const totalLift = BANDS.reduce((sum, band) => sum + bandLift[band], 0);
  if (totalLift <= 0) return 1;
  const fitScore = BANDS.reduce((sum, band) => sum + (bandLift[band] / totalLift) * playerWeights[band], 0);
  return 1 - spread / 2 + fitScore * spread;
}

export function evaluateCpuArchetypeFit(
  player: CpuShillAuctionPlayer,
  shill: CpuShillProfile,
): number {
  const weights = normalizePlayerArchetypeWeights(player.archetypeWeights);
  if (weights === null) return 1;

  const resolved = resolveShillProfile(shill, `${shill.teamId}:archetype`);
  const bandLift = bandLiftFromPriorities(resolved.bandPriorities);
  const spread = CPU_SHILL_PERSONALITY_PROFILES[resolved.personality].archetypeFitSpread;
  return bandFitMultiplier(weights, bandLift, spread);
}

export function evaluateCpuInterest(
  lot: CpuInterestLot,
  shill: CpuShillProfile,
  seed: string,
): boolean {
  const probability = bargainInterestProbability(lot, shill);
  if (probability <= 0) return false;
  return seededUnit(`${seed}:${shill.teamId}:${lot.playerId}:interest`) < probability;
}

export function bargainInterestProbability(lot: CpuInterestLot, shill: CpuShillProfile): number {
  const resolved = resolveShillProfile(shill, `${shill.teamId}:interest`);
  if (
    !Number.isFinite(lot.currentAsk) ||
    !Number.isFinite(lot.valuation) ||
    !Number.isFinite(lot.maxBid) ||
    lot.currentAsk <= 0 ||
    lot.valuation <= lot.currentAsk ||
    lot.maxBid < lot.currentAsk
  ) {
    return 0;
  }

  const discount = clamp01((lot.valuation - lot.currentAsk) / lot.valuation);
  // D14 says bargainInterestCurve is TBD/playtest. This conservative sim-tune
  // curve makes deeper bargains more likely without any guaranteed bid branch.
  const base =
    discount < 0.05 ? 0.05 :
    discount < 0.15 ? 0.14 :
    discount < 0.30 ? 0.32 :
    discount < 0.45 ? 0.56 :
    0.76;
  const budgetRoom = clamp01((lot.maxBid - lot.currentAsk) / Math.max(1, lot.valuation - lot.currentAsk));
  const budgetFactor = 0.55 + budgetRoom * 0.45;

  return clamp(base * resolved.interestAggression * budgetFactor, 0, resolved.maxInterestProbability);
}

/** FABLE-C3: opt-in bidding refinements for COMPLETING CPU teams (never pure-pressure shills). */
export interface CpuBidOptions {
  /**
   * The need-aware endgame override: once every remaining roster slot is spoken for by a hard
   * requirement, a completing team never PASSES an affordable player who fills one — passing is
   * permanent in this auction, and need-blind passes can wedge a full-CPU draft by draining the
   * pool's needed classes while wrong-class surplus remains (FABLE-C3 sweep finding).
   */
  needAwareCompletion?: boolean;
}

/**
 * True when the need-aware override should force a bid/claim: the team is COMPLETING (not an
 * end-checkpoint shill), every remaining slot is a hard requirement, this candidate fills one,
 * and the price fits under the completion ceiling. Permissive-fallback on missing position info.
 */
function needOverrideApplies(
  session: CpuShillAuctionSession,
  team: { teamId: string; rosterSlotsRemaining: number; roster: readonly { playerId: string }[] },
  playerId: string,
  price: number,
  maxBid: number,
  options: CpuBidOptions | undefined,
): boolean {
  if (!options?.needAwareCompletion) return false;
  if (price > maxBid) return false;
  if (session.config.nonCompletingTeamIds?.includes(team.teamId)) return false;
  const candidateShape = session.players[playerId]?.pos;
  if (!candidateShape) return false;
  const positions: Record<string, NonNullable<AuctionPlayer['pos']>> = { [playerId]: candidateShape };
  for (const assignment of team.roster) {
    const shape = session.players[assignment.playerId]?.pos;
    if (!shape) return false;
    positions[assignment.playerId] = shape;
  }
  const need = teamRosterNeed(team.roster.map((assignment) => assignment.playerId), positions);
  if (need === null) return false;
  if (!playerFillsHardRequirement(candidateShape, need)) return false;

  // Trigger 1 — endgame-tight: every remaining slot is spoken for by a hard requirement.
  if (need.minimumAdditions >= team.rosterSlotsRemaining) return true;

  // Trigger 2 — CLASS scarcity (FABLE-C3 sweep findings rounds 2-4): needed classes get consumed
  // by rival sales long before a team is endgame-tight. The exact signal: this candidate serves a
  // class whose remaining supply is below MY OWN demand for it — grab now, passing is permanent.
  // (Fungible needs with plentiful substitutes deliberately never trigger this.)
  return servesOwnTightClass(session, team.teamId, playerId);
}

export function cpuBidOnLot(
  session: CpuShillAuctionSession,
  shillTeamId: string,
  seed: string,
  options?: CpuBidOptions,
): CpuBidOnLotDecision {
  if (session.state !== 'OPEN_BIDDING') {
    return passDecision(shillTeamId, null, 'not-open-bidding', null, null, null, null);
  }

  const lot = session.currentLot;
  if (lot === null) {
    return passDecision(shillTeamId, null, 'missing-lot', null, null, null, null);
  }

  const shill = resolveSessionShill(session, shillTeamId, seed);
  const playerId = lot.playerId;
  if (!lot.stillIn.includes(shillTeamId)) {
    return passDecision(shillTeamId, playerId, 'team-not-in-lot', null, null, null, shill.personality);
  }
  if (lot.highBidder === shillTeamId) {
    return passDecision(shillTeamId, playerId, 'already-high-bidder', null, null, null, shill.personality);
  }

  const team = findTeam(session, shillTeamId);
  if (team === null) {
    return passDecision(shillTeamId, playerId, 'team-not-found', null, null, null, shill.personality);
  }
  if (team.rosterSlotsRemaining <= 0) {
    return passDecision(shillTeamId, playerId, 'team-full', null, null, null, shill.personality);
  }
  if (shill.shillMaxWins != null && team.roster.length >= shill.shillMaxWins) {
    return passDecision(shillTeamId, playerId, 'team-full', null, null, null, shill.personality);
  }

  const player = session.players[playerId] as CpuShillAuctionPlayer | undefined;
  if (player === undefined) {
    return passDecision(shillTeamId, playerId, 'unknown-player', null, null, null, shill.personality);
  }

  const minimumBid = minimumLegalBid(lot, session.config.bidIncrement);
  const maxBid = sessionBidCeiling(session, shillTeamId) ?? 0;
  const valuation = evaluateCpuValuation(player, shill, seed);

  if (minimumBid > maxBid) {
    return passDecision(shillTeamId, playerId, 'over-budget', minimumBid, maxBid, valuation, shill.personality);
  }
  const mustBuy = needOverrideApplies(session, team, playerId, minimumBid, maxBid, options);
  // The flex-absorption politeness (FABLE-C3 sweep finding round 3): a CPU never SNIPES into a
  // jointly-tight class it doesn't need — legal for humans, but blind CPU sniping at the tail
  // starves rivals' floors and wedges the draft. Opt-in with the same need-aware flag.
  if (!mustBuy && options?.needAwareCompletion && wouldStarveJointDemand(session, shillTeamId, playerId)) {
    return passDecision(shillTeamId, playerId, 'no-interest', minimumBid, maxBid, valuation, shill.personality);
  }
  if (!mustBuy && minimumBid >= valuation) {
    return passDecision(shillTeamId, playerId, 'over-valuation', minimumBid, maxBid, valuation, shill.personality);
  }
  if (!mustBuy && !evaluateCpuInterest({ playerId, currentAsk: minimumBid, valuation, maxBid }, shill, seed)) {
    return passDecision(shillTeamId, playerId, 'no-interest', minimumBid, maxBid, valuation, shill.personality);
  }

  return {
    kind: 'bid',
    teamId: shillTeamId,
    playerId,
    bid: minimumBid,
    minimumBid,
    maxBid,
    valuation,
    personality: shill.personality,
  };
}

export function cpuDecideLoneSurvivor(
  session: CpuShillAuctionSession,
  teamId: string,
  seed: string,
  options?: CpuBidOptions,
): CpuLoneSurvivorDecision {
  if (session.state !== 'RESOLVE') {
    return loneSurvivorPassDecision(teamId, null, 'not-resolve', null, null);
  }

  const claim = session.pendingClaim;
  if (claim === null) {
    return loneSurvivorPassDecision(teamId, null, 'no-pending-claim', null, null);
  }
  if (claim.teamId !== teamId) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'not-this-team', null, null);
  }

  const shill = resolveSessionShill(session, teamId, seed);
  const team = findTeam(session, teamId);
  if (team === null || team.rosterSlotsRemaining <= 0) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'team-full', null, null);
  }
  if (shill.shillMaxWins != null && team.roster.length >= shill.shillMaxWins) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'team-full', null, null);
  }

  const player = session.players[claim.playerId] as CpuShillAuctionPlayer | undefined;
  if (player === undefined) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'unknown-player', null, null);
  }

  const price = claim.price;
  const maxBid = sessionBidCeiling(session, teamId) ?? 0;
  const valuation = evaluateCpuValuation(player, shill, seed);

  if (price > maxBid) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'over-budget', valuation, maxBid);
  }
  const mustBuy = needOverrideApplies(session, team, claim.playerId, price, maxBid, options);
  if (!mustBuy && valuation <= price) {
    return loneSurvivorPassDecision(teamId, claim.playerId, 'over-valuation', valuation, maxBid);
  }

  return {
    kind: 'claim',
    teamId,
    playerId: claim.playerId,
    price,
    valuation,
    maxBid,
  };
}

export function shillNoiseMultiplier(seed: string): number {
  return 1 - SHILL_NOISE_SPREAD + seededUnit(seed) * SHILL_NOISE_SPREAD * 2;
}

function resolveSessionShill(
  session: CpuShillAuctionSession,
  shillTeamId: string,
  seed: string,
): ResolvedCpuShillProfile {
  return resolveShillProfile(session.cpuShills?.[shillTeamId] ?? buildSeededCpuShill(shillTeamId, seed), seed);
}

function resolveShillProfile(shill: CpuShillProfile, seed: string): ResolvedCpuShillProfile {
  const defaults = CPU_SHILL_PERSONALITY_PROFILES[shill.personality];
  return {
    ...shill,
    bandPriorities: normalizeBandPriorities(
      shill.bandPriorities ?? buildArchetypeShillProfile(shill.teamId, seed).bandPriorities,
    ),
    personalityBias: shill.personalityBias ?? defaults.personalityBias,
    interestAggression: shill.interestAggression ?? defaults.interestAggression,
    maxInterestProbability: Math.min(
      shill.maxInterestProbability ?? defaults.maxInterestProbability,
      NO_FLOOR_MAX_INTEREST_PROBABILITY,
    ),
  };
}

/**
 * A team archetype's band-priority shape: the archetype's positive cap-shift mass per band,
 * normalized so the strongest band scores 1. This is the ONE archetype→band bridge — the hidden
 * shill demand AND the market predictor's 24-archetype mixture both price through it (FABLE-C2B).
 */
export function archetypeBandPriorities(arch: HistoricalArchetype): BandPriorities {
  const lift = Object.fromEntries(BANDS.map((band) => [band, 0])) as Record<Band, number>;
  for (const [luxKey, frac] of Object.entries(archetypeCapShift(arch))) {
    const stat = luxKeyToModStat(luxKey);
    if (stat === undefined || frac <= 0) continue;
    for (const band of BANDS) {
      if (BAND_STATS[band].includes(stat)) lift[band] += frac;
    }
  }
  const top = Math.max(...BANDS.map((band) => lift[band]));
  if (top <= 0) {
    return Object.fromEntries(BANDS.map((band) => [band, 1])) as BandPriorities;
  }
  return Object.fromEntries(BANDS.map((band) => [band, lift[band] / top])) as BandPriorities;
}

/**
 * Seed a shill with its own HIDDEN archetype from the locked 24 (spec §6:195-197 "each shill
 * builds toward its OWN secret archetype"; audit AUC-5 replaced the arbitrary 2-band vector).
 * Deterministic per (teamId, seed); personality stays independently seeded.
 */
export function buildArchetypeShillProfile(teamId: string, seed: string): CpuShillProfile {
  const archetype =
    HISTORICAL_ARCHETYPES[hashString(`${seed}:${teamId}:archetype`) % HISTORICAL_ARCHETYPES.length];
  return {
    teamId,
    personality: CPU_SHILL_PERSONALITIES[
      hashString(`${seed}:${teamId}:personality`) % CPU_SHILL_PERSONALITIES.length
    ],
    archetypeId: archetype.id,
    bandPriorities: archetypeBandPriorities(archetype),
  };
}

export function buildClubCpuProfile(input: {
  teamId: string;
  leagueId: string;
  bandPriorities: BandPriorities;
  archetypeId?: string | null;
}): CpuShillProfile {
  return {
    teamId: input.teamId,
    personality: CPU_SHILL_PERSONALITIES[
      hashString(`${input.leagueId}:${input.teamId}:club-personality`) % CPU_SHILL_PERSONALITIES.length
    ],
    bandPriorities: input.bandPriorities,
    ...(input.archetypeId ? { archetypeId: input.archetypeId } : {}),
  };
}

function buildSeededCpuShill(teamId: string, seed: string): CpuShillProfile {
  return buildArchetypeShillProfile(teamId, seed);
}

function normalizeBandPriorities(priorities: BandPriorities): BandPriorities {
  return Object.fromEntries(
    BANDS.map((band) => {
      const value = priorities[band];
      return [band, Number.isFinite(value) && value > 0 ? value : 0];
    }),
  ) as BandPriorities;
}

function normalizePlayerArchetypeWeights(
  weights: Partial<Record<Band, number>> | undefined,
): Record<Band, number> | null {
  if (weights === undefined) return null;
  const normalized = Object.fromEntries(
    BANDS.map((band) => [band, clamp01(weights[band] ?? 0)]),
  ) as Record<Band, number>;
  return BANDS.some((band) => normalized[band] > 0) ? normalized : null;
}

function minimumLegalBid(lot: AuctionSession['currentLot'] & NonNullable<AuctionSession['currentLot']>, bidIncrement: number): number {
  return lot.highBid === null ? lot.openingAsk : lot.highBid + bidIncrement;
}

function findTeam(session: AuctionSession, teamId: string) {
  return session.teams.find((team) => team.teamId === teamId) ?? null;
}

function passDecision(
  teamId: string,
  playerId: string | null,
  reason: CpuBidPassReason,
  minimumBid: number | null,
  maxBid: number | null,
  valuation: number | null,
  personality: CpuShillPersonality | null,
): CpuBidOnLotDecision {
  return { kind: 'pass', teamId, playerId, reason, minimumBid, maxBid, valuation, personality };
}

function loneSurvivorPassDecision(
  teamId: string,
  playerId: string | null,
  reason: CpuLoneSurvivorPassReason,
  valuation: number | null,
  maxBid: number | null,
): CpuLoneSurvivorDecision {
  return { kind: 'pass', teamId, playerId, reason, valuation, maxBid };
}

function seededUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
