import { auctionMaxBid, reservePriceCurve } from '../data/rosterEngineConstants';
import {
  BANDS,
  BAND_STATS,
  composeIdentity,
  identityCapShift,
  type Band,
  type BandPriorities,
} from './leagueConstruction';
import {
  getCurrentNominator,
  nominatePlayer,
  type AuctionPlayer,
  type AuctionSession,
} from './auctionStateMachine';

export type CpuShillPersonality = 'sniper' | 'spender' | 'zealot';

export interface CpuShillProfile {
  teamId: string;
  personality: CpuShillPersonality;
  bandPriorities: BandPriorities;
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

export type CpuNominationPassReason =
  | 'expected-nomination'
  | 'no-current-nominator'
  | 'no-legal-player'
  | 'team-not-on-clock';

export type CpuNominationDecision =
  | {
      kind: 'nominate';
      teamId: string;
      playerId: string;
      openingAsk: number;
      valuation: number;
      score: number;
      personality: CpuShillPersonality;
    }
  | {
      kind: 'pass';
      teamId: string;
      reason: CpuNominationPassReason;
    };

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

export function evaluateCpuArchetypeFit(
  player: CpuShillAuctionPlayer,
  shill: CpuShillProfile,
): number {
  const weights = normalizePlayerArchetypeWeights(player.archetypeWeights);
  if (weights === null) return 1;

  const resolved = resolveShillProfile(shill, `${shill.teamId}:archetype`);
  const identity = composeIdentity(normalizeBandPriorities(resolved.bandPriorities));
  const capShift = identityCapShift(identity);
  const bandLift = Object.fromEntries(
    BANDS.map((band) => [
      band,
      BAND_STATS[band].reduce((sum, stat) => sum + Math.max(0, capShift[stat]), 0),
    ]),
  ) as Record<Band, number>;
  const totalLift = BANDS.reduce((sum, band) => sum + bandLift[band], 0);
  if (totalLift <= 0) return 1;

  const fitScore = BANDS.reduce((sum, band) => sum + (bandLift[band] / totalLift) * weights[band], 0);
  const spread = CPU_SHILL_PERSONALITY_PROFILES[resolved.personality].archetypeFitSpread;
  return 1 - spread / 2 + fitScore * spread;
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

export function cpuBidOnLot(
  session: CpuShillAuctionSession,
  shillTeamId: string,
  seed: string,
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

  const player = session.players[playerId] as CpuShillAuctionPlayer | undefined;
  if (player === undefined) {
    return passDecision(shillTeamId, playerId, 'unknown-player', null, null, null, shill.personality);
  }

  const minimumBid = minimumLegalBid(lot, session.config.bidIncrement);
  const maxBid = auctionMaxBid(
    team.budgetRemaining,
    team.rosterSlotsRemaining,
    team.minSalary,
    team.projectedTax,
  );
  const valuation = evaluateCpuValuation(player, shill, seed);

  if (minimumBid > maxBid) {
    return passDecision(shillTeamId, playerId, 'over-budget', minimumBid, maxBid, valuation, shill.personality);
  }
  if (minimumBid >= valuation) {
    return passDecision(shillTeamId, playerId, 'over-valuation', minimumBid, maxBid, valuation, shill.personality);
  }
  if (!evaluateCpuInterest({ playerId, currentAsk: minimumBid, valuation, maxBid }, shill, seed)) {
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

export function resolveCpuNomination(
  session: CpuShillAuctionSession,
  shillTeamId: string,
  seed: string,
): CpuNominationDecision {
  if (session.state !== 'NOMINATION') {
    return { kind: 'pass', teamId: shillTeamId, reason: 'expected-nomination' };
  }
  const nominator = getCurrentNominator(session);
  if (nominator === null) {
    return { kind: 'pass', teamId: shillTeamId, reason: 'no-current-nominator' };
  }
  if (nominator !== shillTeamId) {
    return { kind: 'pass', teamId: shillTeamId, reason: 'team-not-on-clock' };
  }

  const shill = resolveSessionShill(session, shillTeamId, seed);
  const personality = CPU_SHILL_PERSONALITY_PROFILES[shill.personality];
  let best:
    | {
        playerId: string;
        openingAsk: number;
        valuation: number;
        score: number;
      }
    | null = null;

  const maxOpeningAsk = Math.max(
    1,
    ...session.availablePlayerIds.map((playerId) => {
      const player = session.players[playerId];
      return player === undefined ? 0 : reservePriceCurve(player.ivPercentile) * player.iv;
    }),
  );

  for (const playerId of session.availablePlayerIds) {
    const legal = nominatePlayer(session, playerId);
    if (!legal.ok) continue;
    const player = session.players[playerId] as CpuShillAuctionPlayer | undefined;
    if (player === undefined) continue;

    const openingAsk = reservePriceCurve(player.ivPercentile) * player.iv;
    const valuation = evaluateCpuValuation(player, shill, `${seed}:nomination`);
    const bargain = Math.max(0, valuation - openingAsk);
    const randomJitter = seededUnit(`${seed}:${shillTeamId}:${playerId}:nomination`) * player.iv * 0.03;
    const score =
      valuation * personality.nominationValueWeight +
      bargain * personality.nominationBargainWeight +
      (openingAsk / maxOpeningAsk) * player.iv * personality.nominationDrainWeight +
      randomJitter;

    if (
      best === null ||
      score > best.score ||
      (score === best.score && playerId.localeCompare(best.playerId) < 0)
    ) {
      best = { playerId, openingAsk, valuation, score };
    }
  }

  if (best === null) {
    return { kind: 'pass', teamId: shillTeamId, reason: 'no-legal-player' };
  }

  return {
    kind: 'nominate',
    teamId: shillTeamId,
    playerId: best.playerId,
    openingAsk: best.openingAsk,
    valuation: best.valuation,
    score: best.score,
    personality: shill.personality,
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
    bandPriorities: normalizeBandPriorities(shill.bandPriorities ?? buildSeededBandPriorities(shill.teamId, seed)),
    personalityBias: shill.personalityBias ?? defaults.personalityBias,
    interestAggression: shill.interestAggression ?? defaults.interestAggression,
    maxInterestProbability: Math.min(
      shill.maxInterestProbability ?? defaults.maxInterestProbability,
      NO_FLOOR_MAX_INTEREST_PROBABILITY,
    ),
  };
}

function buildSeededCpuShill(teamId: string, seed: string): CpuShillProfile {
  const personalities: readonly CpuShillPersonality[] = ['sniper', 'spender', 'zealot'];
  return {
    teamId,
    personality: personalities[hashString(`${seed}:${teamId}:personality`) % personalities.length],
    bandPriorities: buildSeededBandPriorities(teamId, seed),
  };
}

function buildSeededBandPriorities(teamId: string, seed: string): BandPriorities {
  const primaryIndex = hashString(`${seed}:${teamId}:primary-band`) % BANDS.length;
  const secondaryIndex = hashString(`${seed}:${teamId}:secondary-band`) % BANDS.length;
  return Object.fromEntries(
    BANDS.map((band, index) => [
      band,
      index === primaryIndex ? 1 : index === secondaryIndex ? 0.65 : 0,
    ]),
  ) as BandPriorities;
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
