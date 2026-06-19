import type { TierKey } from '../data/tierParams';
import type { CanonicalPersonality } from './masterMoraleMatrix';

/**
 * L10-1 random-event selection engine (pure, build-dark).
 *
 * DEFAULTS-TAKEN from spec-docs/L10_SCOPE_MAP.md:
 * 1. Family 6 personality shift is arc-earned and excluded from this roll.
 * 2. Name-change IS in the catalog as a rare DISTINCT cosmetic-family event
 *    (dark). It is NOT excluded by omission; the opt-in is honored at the
 *    post-D13 confirm/apply step. Its own dedicated rate is rarer than the
 *    ordinary cosmetic_change rate.
 * 3. Cadence is CONTINUOUS per-game (owned by L10-3): the sweep fires on every
 *    completed game, so these base rates are PER-GAME §16 SIM-TUNE placeholders.
 * 4. Within-family concrete resolution is downstream; this emits representative candidates.
 * 5. Base rates and magnitudes are Section 16 SIM-TUNE placeholders.
 * 6. roster/trade_demand is proposed only; propensity math stays in tradeRequestGeneration.ts.
 *
 * Eligibility map:
 * - player: performance, trait, role, cosmetic, roster, wildcard.
 * - pitcher-only: pitching, requiring role === 'pitcher'.
 * - team: team only. The team family emits front_office_mandate and a distinct
 *   stadium_change candidate, both suppressed by high fan morale.
 */

// The 8 sweepable families. Personality-shift (spec family 6) is ARC-EARNED and DELIBERATELY EXCLUDED.
export type FranchiseL10EventFamily =
  | 'performance'
  | 'pitching'
  | 'trait'
  | 'role'
  | 'cosmetic'
  | 'team'
  | 'roster'
  | 'wildcard';

export interface FranchiseL10EventTuning {
  baseRate: Record<FranchiseL10EventFamily, number>;
  nameChangeBaseRate: number;
  intensityMultiplier: Record<TierKey, number>;
  personalitySensitivity: Record<CanonicalPersonality, number>;
  neutralMorale: number;
  moraleWeight: number;
  fanMoraleSuppression: number;
  positiveMoraleBias: number;
}

// Section 16 SIM-TUNE placeholders: conservative, low-damage rates and magnitudes.
export const FRANCHISE_L10_EVENT_TUNING: FranchiseL10EventTuning = {
  baseRate: {
    performance: 0.006,
    pitching: 0.0035,
    trait: 0.0025,
    role: 0.002,
    cosmetic: 0.0018,
    team: 0.0018,
    roster: 0.0025,
    wildcard: 0.001,
  },
  nameChangeBaseRate: 0.0004,
  intensityMultiplier: {
    juiced: 1.3,
    standard: 1.0,
    nerfed: 0.6,
  },
  personalitySensitivity: {
    COMPETITIVE: 1.15,
    RELAXED: 0.75,
    DROOPY: 1.1,
    JOLLY: 0.9,
    TOUGH: 0.85,
    TIMID: 1.05,
    EGOTISTICAL: 1.25,
  },
  neutralMorale: 50,
  moraleWeight: 0.35,
  fanMoraleSuppression: 0.65,
  positiveMoraleBias: 0.5,
};

export interface FranchiseL10Candidate {
  id: string;
  kind: 'player' | 'team';
  role?: 'pitcher' | 'position';
  personality?: CanonicalPersonality;
  playerMorale?: number;
  fanMorale?: number;
  performanceSignal?: number;
}

export interface FranchiseL10EventCandidate {
  family: FranchiseL10EventFamily;
  eventType: string;
  targetId: string;
  targetKind: 'player' | 'team';
  valence: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  probability: number;
  seed: number;
}

export interface FranchiseL10EventReport {
  events: FranchiseL10EventCandidate[];
}

export interface FranchiseL10SweepInput {
  candidates: readonly FranchiseL10Candidate[];
  intensity: TierKey;
  seedBase: string;
}

type FranchiseL10RollSpec = {
  family: FranchiseL10EventFamily;
  eventType?: string;
  seedSuffix?: string;
  teamSuppressed?: boolean;
  baseRateOverride?: number;
};

type FranchiseL10ProbabilityResult = {
  probability: number;
  components: {
    baseRate: number;
    intensityScale: number;
    moraleFactor: number;
    personalityFactor: number;
    performanceSignalFactor: number;
  };
};

const FRANCHISE_L10_EVENT_MAGNITUDE: Record<FranchiseL10EventFamily, number> = {
  performance: 1,
  pitching: 1,
  trait: 1,
  role: 1,
  cosmetic: 1,
  team: 1,
  roster: 1,
  wildcard: 1,
};

const PLAYER_FAMILIES: readonly FranchiseL10EventFamily[] = [
  'performance',
  'pitching',
  'trait',
  'role',
  'cosmetic',
  'roster',
  'wildcard',
];

const TEAM_ROLL_SPECS: readonly FranchiseL10RollSpec[] = [
  { family: 'team', eventType: 'front_office_mandate', seedSuffix: 'front_office_mandate', teamSuppressed: true },
  { family: 'team', eventType: 'stadium_change', seedSuffix: 'stadium_change', teamSuppressed: true },
];

const POSITIVE_EVENT_TYPE: Partial<Record<FranchiseL10EventFamily, string>> = {
  performance: 'hot_streak',
  pitching: 'gain_pitch',
  trait: 'earn_trait',
};

const NEGATIVE_EVENT_TYPE: Partial<Record<FranchiseL10EventFamily, string>> = {
  performance: 'slump',
  pitching: 'lose_pitch_feel',
  trait: 'lose_trait',
};

const NEUTRAL_EVENT_TYPE: Partial<Record<FranchiseL10EventFamily, string>> = {
  role: 'gain_secondary_position',
  cosmetic: 'cosmetic_change',
  wildcard: 'wildcard',
};

export function computeFranchiseL10Events(
  input: FranchiseL10SweepInput,
  config: FranchiseL10EventTuning = FRANCHISE_L10_EVENT_TUNING,
): FranchiseL10EventReport {
  const events: FranchiseL10EventCandidate[] = [];

  for (const candidate of input.candidates) {
    for (const spec of getEligibleRollSpecs(candidate, config)) {
      const rollSeed = getRollSeed(input.seedBase, candidate.id, spec);
      const roll = franchiseL10DeterministicRoll(rollSeed);
      const probabilityResult = computeProbability(candidate, spec, input.intensity, config);

      if (roll >= probabilityResult.probability) {
        continue;
      }

      events.push(buildEventCandidate(candidate, spec, input.seedBase, probabilityResult.probability, roll, config));
    }
  }

  return { events: events.sort(compareEvents) };
}

export function franchiseL10DeterministicRoll(seed: string): number {
  return Number((hashString(seed) / 0xffffffff).toFixed(6));
}

function getEligibleRollSpecs(
  candidate: FranchiseL10Candidate,
  config: FranchiseL10EventTuning,
): FranchiseL10RollSpec[] {
  if (candidate.kind === 'team') {
    return [...TEAM_ROLL_SPECS];
  }

  const specs: FranchiseL10RollSpec[] = PLAYER_FAMILIES
    .filter((family) => family !== 'pitching' || candidate.role === 'pitcher')
    .map((family) => ({ family }));

  // Q8: name_change is a DISTINCT rare cosmetic-family event with its own
  // dedicated rate, independent of the ordinary cosmetic_change roll (distinct
  // seedSuffix). Players only — teams never roll name_change.
  specs.push({
    family: 'cosmetic',
    eventType: 'name_change',
    seedSuffix: 'name_change',
    baseRateOverride: config.nameChangeBaseRate,
  });

  return specs;
}

function computeProbability(
  candidate: FranchiseL10Candidate,
  spec: FranchiseL10RollSpec,
  intensity: TierKey,
  config: FranchiseL10EventTuning,
): FranchiseL10ProbabilityResult {
  const baseRate = spec.baseRateOverride ?? config.baseRate[spec.family];
  const intensityScale = config.intensityMultiplier[intensity];
  const moraleFactor = getMoraleFactor(candidate, spec, config);
  const personalityFactor = candidate.personality
    ? config.personalitySensitivity[candidate.personality]
    : 1;
  const performanceSignalFactor = spec.family === 'performance'
    ? getPerformanceSignalFactor(candidate.performanceSignal)
    : 1;
  const probability = clamp(
    baseRate * intensityScale * moraleFactor * personalityFactor * performanceSignalFactor,
    0,
    1,
  );

  return {
    probability,
    components: {
      baseRate,
      intensityScale,
      moraleFactor,
      personalityFactor,
      performanceSignalFactor,
    },
  };
}

function buildEventCandidate(
  candidate: FranchiseL10Candidate,
  spec: FranchiseL10RollSpec,
  seedBase: string,
  probability: number,
  roll: number,
  config: FranchiseL10EventTuning,
): FranchiseL10EventCandidate {
  const family = spec.family;
  const valence = getValence(seedBase, candidate, family, config);
  const eventType = getEventType(seedBase, candidate.id, family, valence, spec);

  return {
    family,
    eventType,
    targetId: candidate.id,
    targetKind: candidate.kind,
    valence,
    magnitude: FRANCHISE_L10_EVENT_MAGNITUDE[family],
    probability,
    seed: roll,
  };
}

function getValence(
  seedBase: string,
  candidate: FranchiseL10Candidate,
  family: FranchiseL10EventFamily,
  config: FranchiseL10EventTuning,
): FranchiseL10EventCandidate['valence'] {
  if (family === 'roster') {
    return getRosterEvent(seedBase, candidate.id).valence;
  }

  if (family !== 'performance' && family !== 'pitching' && family !== 'trait') {
    return 'neutral';
  }

  const morale = getPlayerMorale(candidate, config);
  const positiveBias = getPositiveBias(morale, config);
  const valenceRoll = franchiseL10DeterministicRoll(`${seedBase}:${candidate.id}:${family}:valence`);

  return valenceRoll < positiveBias ? 'positive' : 'negative';
}

function getEventType(
  seedBase: string,
  candidateId: string,
  family: FranchiseL10EventFamily,
  valence: FranchiseL10EventCandidate['valence'],
  spec: FranchiseL10RollSpec,
): string {
  if (spec.eventType) {
    return spec.eventType;
  }

  if (family === 'roster') {
    return getRosterEvent(seedBase, candidateId).eventType;
  }

  if (valence === 'positive') {
    return POSITIVE_EVENT_TYPE[family] ?? 'wildcard';
  }

  if (valence === 'negative') {
    return NEGATIVE_EVENT_TYPE[family] ?? 'wildcard';
  }

  return NEUTRAL_EVENT_TYPE[family] ?? 'wildcard';
}

function getRosterEvent(
  seedBase: string,
  candidateId: string,
): Pick<FranchiseL10EventCandidate, 'eventType' | 'valence'> {
  const roll = franchiseL10DeterministicRoll(`${seedBase}:${candidateId}:roster:eventType`);

  if (roll < 1 / 3) {
    return { eventType: 'trade_demand', valence: 'negative' };
  }

  if (roll < 2 / 3) {
    return { eventType: 'mentorship', valence: 'positive' };
  }

  return { eventType: 'clubhouse_rift', valence: 'negative' };
}

function getMoraleFactor(
  candidate: FranchiseL10Candidate,
  spec: FranchiseL10RollSpec,
  config: FranchiseL10EventTuning,
): number {
  if (candidate.kind === 'team' || spec.teamSuppressed) {
    const fanMorale = clamp(candidate.fanMorale ?? config.neutralMorale, 0, 100);
    const aboveNeutral = Math.max(0, fanMorale - config.neutralMorale);
    const normalized = config.neutralMorale > 0 ? aboveNeutral / config.neutralMorale : 0;

    return clamp(1 - (config.fanMoraleSuppression * normalized), 0, 1);
  }

  const morale = getPlayerMorale(candidate, config);
  const normalizedDistance = config.neutralMorale > 0
    ? Math.abs(morale - config.neutralMorale) / config.neutralMorale
    : 0;

  return 1 + (normalizedDistance * config.moraleWeight);
}

function getPositiveBias(playerMorale: number, config: FranchiseL10EventTuning): number {
  const normalized = config.neutralMorale > 0
    ? (playerMorale - config.neutralMorale) / config.neutralMorale
    : 0;

  return clamp(config.positiveMoraleBias + (normalized * config.moraleWeight), 0, 1);
}

function getPlayerMorale(candidate: FranchiseL10Candidate, config: FranchiseL10EventTuning): number {
  return clamp(candidate.playerMorale ?? config.neutralMorale, 0, 100);
}

function getPerformanceSignalFactor(performanceSignal: number | undefined): number {
  if (performanceSignal === undefined) {
    return 1;
  }

  return 1 + (Math.abs(clamp(performanceSignal, -1, 1)) * 0.25);
}

function getRollSeed(seedBase: string, candidateId: string, spec: FranchiseL10RollSpec): string {
  const suffix = spec.seedSuffix ? `:${spec.seedSuffix}` : '';

  return `${seedBase}:${candidateId}:${spec.family}${suffix}`;
}

function compareEvents(first: FranchiseL10EventCandidate, second: FranchiseL10EventCandidate): number {
  return compareStrings(first.targetId, second.targetId)
    || compareStrings(first.family, second.family)
    || compareStrings(first.eventType, second.eventType);
}

function compareStrings(first: string, second: string): number {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
