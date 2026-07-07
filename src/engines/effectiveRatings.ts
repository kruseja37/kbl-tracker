import {
  DEFENSIVE_MOJO_DRIFT_STEPS,
  DEFENSIVE_PLACEMENT_SCALING,
  DEFENSIVE_POSITION_PENALTY_MULTIPLIER,
  FATIGUE_MODEL,
  MOJO_DELTAS,
  OUT_OF_POSITION_MOJO_PENALTY,
  POSITION_CHANCE_FREQUENCY,
  POTENCY_SCALE,
  PRESSURE_MULTIPLIER,
  TWO_WAY_TRAIT_POSITION,
  type EffectiveMojoState,
  type PitcherRoleKey,
  type PotencyTier,
} from '../data/rosterEngineConstants';
import {
  TRAIT_INTERACTION_MATRIX,
  type Attr,
  type PredicateCondition,
  type TraitMatrixEntry,
} from '../data/traitInteractionMatrix';

type MojoState = EffectiveMojoState;
export type FitnessState = 'JUICED' | 'FIT' | 'WELL' | 'STRAINED' | 'WEAK' | 'HURT';
export type Position = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'RP' | 'CP';
export type Ratings = Record<Attr, number>;

export interface PlayerState {
  mojo: MojoState;
  fitness: FitnessState;
  workload?: {
    role?: PitcherRoleKey;
    pitchesThrown?: number;
    gamesSinceLastAppearance?: number;
    catcherConsecutiveGames?: number;
  };
}

export interface GameContext {
  count?: { balls: number; strikes: number };
  pressure: 'none' | 'high' | 'extreme';
  runnersOn: boolean | number;
  risp: boolean;
  opposingHand: 'L' | 'R';
  opposingPlayer?: EffectiveRatingsPlayer;
  inning: number;
  isSubstitutionAB?: boolean;
  stealAttempt?: boolean;
  roundingBase?: boolean;
  runningOutOfBox?: boolean;
  buntAttempt?: boolean;
  pitchType?: 'fastball' | 'offspeed' | '4F' | '2F' | 'CF' | 'SL' | 'CB' | 'SB' | 'CH' | 'FK';
  pitchLocation?: 'low' | 'high' | 'inside' | 'outside' | 'outOfZone';
  teamLosing?: boolean;
  basesEmpty?: boolean;
  consecutiveBaserunnersAllowed?: number;
  comebackerToPitcher?: boolean;
  playingPosition?: Position;
  onBasePath?: { nextBaseOpen?: boolean };
  fieldingChance?: boolean;
  gameLengthInnings?: number;
  batterHand?: 'L' | 'R' | 'S';
  pitcherHand?: 'L' | 'R';
}

export interface PlacementRisk {
  chanceFrequency: number;
  errorLikelihood: number;
  spectacularLikelihood: number;
  expectedMojoDriftPerGame: number;
}

export interface EffectiveRatingsPlayer {
  id?: string;
  name?: string;
  primaryPosition?: string | null;
  secondaryPosition?: string | null;
  secondaryPositions?: string[];
  position?: string | null;
  role?: string | null;
  bats?: 'L' | 'R' | 'S' | string;
  throws?: 'L' | 'R' | string;
  grade?: string | null;
  overallGrade?: string | null;
  tier?: string | null;
  traits?: string[] | { trait1?: string | null; trait2?: string | null };
  trait1?: string | null;
  trait2?: string | null;
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  batterRatings?: Partial<Record<'power' | 'contact' | 'speed' | 'fielding' | 'arm' | Attr, number>>;
  battingRatings?: Partial<Record<'power' | 'contact' | 'speed' | 'fielding' | 'arm' | Attr, number>>;
  pitcherRatings?: Partial<Record<'velocity' | 'junk' | 'accuracy' | Attr, number>>;
  ratings?: Partial<Record<'power' | 'contact' | 'speed' | 'fielding' | 'arm' | 'velocity' | 'junk' | 'accuracy' | Attr, number>>;
}

const ATTRS: Attr[] = ['POW', 'CON', 'SPD', 'FLD', 'ARM', 'VEL', 'JNK', 'ACC'];
const ZERO_RATINGS: Ratings = { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 };
const GRADE_RANK: Record<string, number> = {
  'A+': 12,
  A: 11,
  'A-': 10,
  'B+': 9,
  B: 8,
  'B-': 7,
  'C+': 6,
  C: 5,
  'C-': 4,
  'D+': 3,
  D: 2,
  'D-': 1,
  F: 0,
};

function cloneZeroRatings(): Ratings {
  return { ...ZERO_RATINGS };
}

function addRatings(left: Ratings, right: Partial<Record<Attr, number>>, scale = 1): Ratings {
  const next = { ...left };
  for (const attr of ATTRS) {
    next[attr] += (right[attr] ?? 0) * scale;
  }
  return next;
}

function subtractAll(ratings: Ratings, amount: number): Ratings {
  const next = { ...ratings };
  for (const attr of ATTRS) {
    next[attr] -= amount;
  }
  return next;
}

function valueFrom(
  player: EffectiveRatingsPlayer,
  attr: Attr,
  lower: 'power' | 'contact' | 'speed' | 'fielding' | 'arm' | 'velocity' | 'junk' | 'accuracy',
): number {
  return Number(
    player[lower]
      ?? player.ratings?.[attr]
      ?? player.ratings?.[lower]
      ?? player.batterRatings?.[attr]
      ?? player.batterRatings?.[lower as 'power' | 'contact' | 'speed' | 'fielding' | 'arm']
      ?? player.battingRatings?.[attr]
      ?? player.battingRatings?.[lower as 'power' | 'contact' | 'speed' | 'fielding' | 'arm']
      ?? player.pitcherRatings?.[attr]
      ?? player.pitcherRatings?.[lower as 'velocity' | 'junk' | 'accuracy']
      ?? 0,
  );
}

function baseRatings(player: EffectiveRatingsPlayer): Ratings {
  return {
    POW: valueFrom(player, 'POW', 'power'),
    CON: valueFrom(player, 'CON', 'contact'),
    SPD: valueFrom(player, 'SPD', 'speed'),
    FLD: valueFrom(player, 'FLD', 'fielding'),
    ARM: valueFrom(player, 'ARM', 'arm'),
    VEL: valueFrom(player, 'VEL', 'velocity'),
    JNK: valueFrom(player, 'JNK', 'junk'),
    ACC: valueFrom(player, 'ACC', 'accuracy'),
  };
}

function playerTraits(player: EffectiveRatingsPlayer | undefined): string[] {
  if (!player) return [];
  const traits = new Set<string>();
  if (Array.isArray(player.traits)) {
    for (const trait of player.traits) {
      if (trait) traits.add(trait);
    }
  } else if (player.traits) {
    if (player.traits.trait1) traits.add(player.traits.trait1);
    if (player.traits.trait2) traits.add(player.traits.trait2);
  }
  if (player.trait1) traits.add(player.trait1);
  if (player.trait2) traits.add(player.trait2);
  return [...traits];
}

function pressureRank(pressure: GameContext['pressure']): number {
  if (pressure === 'extreme') return 2;
  if (pressure === 'high') return 1;
  return 0;
}

function runnerCount(ctx: GameContext): number | undefined {
  if (typeof ctx.runnersOn === 'number') return ctx.runnersOn;
  if (ctx.runnersOn) return 1;
  if (ctx.basesEmpty === true) return 0;
  return undefined;
}

function normalizePosition(position: string | null | undefined): Position | undefined {
  if (!position) return undefined;
  const normalized = position.toUpperCase();
  if (normalized === 'P') return 'SP';
  if (normalized === 'SP/RP') return 'RP';
  if (normalized === 'C' || normalized === '1B' || normalized === '2B' || normalized === 'SS'
    || normalized === '3B' || normalized === 'LF' || normalized === 'CF' || normalized === 'RF'
    || normalized === 'DH' || normalized === 'SP' || normalized === 'RP' || normalized === 'CP') {
    return normalized;
  }
  return undefined;
}

function positionScope(position: Position | undefined): 'catcher' | 'infield' | 'outfield' | undefined {
  if (position === 'C') return 'catcher';
  if (position === '1B' || position === '2B' || position === 'SS' || position === '3B') return 'infield';
  if (position === 'LF' || position === 'CF' || position === 'RF') return 'outfield';
  return undefined;
}

function isSameHand(batterHand: GameContext['batterHand'], pitcherHand: GameContext['pitcherHand']): boolean | undefined {
  if (!batterHand || !pitcherHand || batterHand === 'S') return undefined;
  return batterHand === pitcherHand;
}

function gradeAtLeast(actual: string | null | undefined, minimum: string): boolean {
  const actualRank = actual ? GRADE_RANK[actual] : undefined;
  const minRank = GRADE_RANK[minimum];
  return actualRank !== undefined && minRank !== undefined && actualRank >= minRank;
}

function playerGrade(player: EffectiveRatingsPlayer | undefined): string | undefined {
  return player?.grade ?? player?.overallGrade ?? player?.tier ?? undefined;
}

function evaluatePredicate(cond: PredicateCondition, ctx: GameContext): boolean {
  switch (cond.kind) {
    case 'always':
      return true;
    case 'count':
      return ctx.count !== undefined
        && (cond.balls === undefined || ctx.count.balls === cond.balls)
        && (cond.strikes === undefined || ctx.count.strikes === cond.strikes);
    case 'countIn':
      return ctx.count !== undefined
        && cond.counts.some((count) => count.balls === ctx.count?.balls && count.strikes === ctx.count.strikes);
    case 'twoStrikes':
      return ctx.count !== undefined && ctx.count.strikes >= 2;
    case 'firstPitch':
      return ctx.count !== undefined && ctx.count.balls === 0 && ctx.count.strikes === 0;
    case 'pressure':
      return pressureRank(ctx.pressure) >= pressureRank(cond.level);
    case 'runnersOn': {
      const count = runnerCount(ctx);
      return count !== undefined && count >= (cond.min ?? 1);
    }
    case 'risp':
      return ctx.risp === true;
    case 'vsHand': {
      if (cond.hand === 'L' || cond.hand === 'R') return ctx.opposingHand === cond.hand;
      const same = isSameHand(ctx.batterHand, ctx.pitcherHand ?? ctx.opposingHand);
      if (same === undefined) return false;
      return cond.hand === 'same' ? same : !same;
    }
    case 'opponentTier':
      return gradeAtLeast(playerGrade(ctx.opposingPlayer), cond.minGrade);
    case 'substitutionAB':
      return ctx.isSubstitutionAB === true;
    case 'inningRange': {
      if (cond.from !== undefined && ctx.inning < cond.from) return false;
      if (cond.final === true) return ctx.inning === (ctx.gameLengthInnings ?? 9);
      if (cond.lastNInnings !== undefined) return ctx.inning >= (ctx.gameLengthInnings ?? 9) - cond.lastNInnings + 1;
      return true;
    }
    case 'onBasePath':
      return cond.nextBaseOpen === undefined
        ? ctx.onBasePath !== undefined
        : ctx.onBasePath?.nextBaseOpen === cond.nextBaseOpen;
    case 'fieldingChance':
      return ctx.fieldingChance === true;
    case 'stealAttempt':
      return ctx.stealAttempt === true;
    case 'roundingBase':
      return ctx.roundingBase === true;
    case 'runningOutOfBox':
      return ctx.runningOutOfBox === true;
    case 'buntAttempt':
      return ctx.buntAttempt === true;
    case 'pitchType': {
      if (!ctx.pitchType) return false;
      const family = ctx.pitchType === '4F' || ctx.pitchType === '2F' || ctx.pitchType === 'CF'
        ? 'fastball'
        : ctx.pitchType === 'SL' || ctx.pitchType === 'CB' || ctx.pitchType === 'SB' || ctx.pitchType === 'CH' || ctx.pitchType === 'FK'
          ? 'offspeed'
          : ctx.pitchType;
      return family === cond.family;
    }
    case 'pitchLocation':
      return ctx.pitchLocation === cond.zone;
    case 'teamLosing':
      return ctx.teamLosing === true;
    case 'basesEmpty':
      return ctx.basesEmpty === true || runnerCount(ctx) === 0;
    case 'consecutiveBaserunnersAllowed':
      return (ctx.consecutiveBaserunnersAllowed ?? 0) >= cond.count;
    case 'comebackerToPitcher':
      return ctx.comebackerToPitcher === true;
    case 'playingPosition': {
      const scope = positionScope(ctx.playingPosition);
      if (cond.scope === 'secondaryPosition') return scope !== undefined;
      return scope === cond.scope;
    }
  }
}

function predicatesActive(entry: TraitMatrixEntry, ctx: GameContext): boolean {
  return entry.predicates.every((predicate) => evaluatePredicate(predicate, ctx));
}

function potencyScale(entry: TraitMatrixEntry, potency: PotencyTier): number {
  if (entry.potency === 'standardInverted') return POTENCY_SCALE.standardInverted[potency];
  return POTENCY_SCALE.positives[potency];
}

function scaledRatingDelta(entry: TraitMatrixEntry, potency: PotencyTier): Partial<Record<Attr, number>> {
  if (entry.effect.kind !== 'ratingDelta') return {};
  if (entry.potency === 'guideExplicit') {
    if (potency === 'L1' && entry.effect.perTier?.l1) return entry.effect.perTier.l1;
    if (potency === 'L3' && entry.effect.perTier?.l3) return entry.effect.perTier.l3;
    return entry.effect.deltas;
  }
  const scale = potencyScale(entry, potency);
  const scaled: Partial<Record<Attr, number>> = {};
  for (const attr of ATTRS) {
    if (entry.effect.deltas[attr] !== undefined) {
      scaled[attr] = entry.effect.deltas[attr] * scale;
    }
  }
  return scaled;
}

function clutchExtremeScale(entry: TraitMatrixEntry, ctx: GameContext): number {
  return ctx.pressure === 'extreme' && (entry.name === 'Clutch' || entry.name === 'Choker') ? 2 : 1;
}

function traitDeltas(
  player: EffectiveRatingsPlayer,
  ctx: GameContext,
  potency: PotencyTier,
  target: TraitMatrixEntry['target'],
): Ratings {
  const traits = new Set(playerTraits(player));
  let deltas = cloneZeroRatings();
  for (const entry of TRAIT_INTERACTION_MATRIX) {
    if (entry.target !== target || !traits.has(entry.name) || !predicatesActive(entry, ctx)) continue;
    if (entry.effect.kind === 'ratingDelta') {
      deltas = addRatings(deltas, scaledRatingDelta(entry, potency), clutchExtremeScale(entry, ctx));
    }
    // §4.1/T6: expectedValueNote and pitchQualityModifier magnitudes are unpublished.
    // They are intentionally documented no-ops in this single-call ratings vector.
    // mojoTransitionRate is a between-events dynamic, not an immediate rating delta.
  }
  return deltas;
}

export function activeTraitNames(
  player: EffectiveRatingsPlayer,
  ctx: GameContext,
  potency: PotencyTier = 'L2',
): string[] {
  void potency;
  const traits = new Set(playerTraits(player));
  const active = new Set<string>();
  for (const entry of TRAIT_INTERACTION_MATRIX) {
    if (!traits.has(entry.name) || !predicatesActive(entry, ctx)) continue;
    active.add(entry.name);
  }
  return [...active];
}

function traitFatigueInputs(
  player: EffectiveRatingsPlayer,
  ctx: GameContext,
  potency: PotencyTier,
): { decayFactor: number; staminaPitches: number } {
  const traits = new Set(playerTraits(player));
  let decayFactor = 1;
  let staminaPitches = 0;
  for (const entry of TRAIT_INTERACTION_MATRIX) {
    if (!traits.has(entry.name) || !predicatesActive(entry, ctx)) continue;
    if (entry.effect.kind === 'fitnessDecayRate') {
      decayFactor *= 1 + (entry.effect.factor - 1) * potencyScale(entry, potency);
    }
    if (entry.effect.kind === 'staminaModifier') {
      staminaPitches += entry.effect.pitches * potencyScale(entry, potency);
    }
  }
  return { decayFactor, staminaPitches };
}

function roleFor(player: EffectiveRatingsPlayer, state: PlayerState): PitcherRoleKey {
  const raw = state.workload?.role ?? player.role ?? player.primaryPosition ?? player.position;
  return raw === 'SP' || raw === 'SP/RP' || raw === 'RP' || raw === 'CP' ? raw : 'SP';
}

function fatigueDecay(
  player: EffectiveRatingsPlayer,
  state: PlayerState,
  ctx: GameContext,
  potency: PotencyTier,
): number {
  const role = roleFor(player, state);
  const inputs = traitFatigueInputs(player, ctx, potency);
  const threshold = FATIGUE_MODEL.rolePitchThresholds[role] + inputs.staminaPitches;
  const pitches = state.workload?.pitchesThrown ?? 0;
  const overuse = Math.max(0, pitches - threshold) * FATIGUE_MODEL.overThresholdPenaltyPerPitch;
  const catcherOverplay = normalizePosition(player.primaryPosition ?? player.position) === 'C'
    && (state.workload?.catcherConsecutiveGames ?? 0) >= FATIGUE_MODEL.catcherRestEveryGames
    ? FATIGUE_MODEL.catcherOverplayPenalty
    : 0;
  const base = FATIGUE_MODEL.fitnessRatingPenalty[state.fitness] + overuse + catcherOverplay;
  return Math.max(0, base * inputs.decayFactor * FATIGUE_MODEL.mojoDecayMultiplier[state.mojo]);
}

function mojoModifier(mojo: MojoState, pressure: GameContext['pressure']): number {
  const multiplier = pressure === 'none' ? 1 : PRESSURE_MULTIPLIER[pressure];
  return MOJO_DELTAS[mojo] * multiplier;
}

function primaryPosition(player: EffectiveRatingsPlayer): Position | undefined {
  return normalizePosition(player.primaryPosition ?? player.position ?? player.role);
}

function secondaryPositions(player: EffectiveRatingsPlayer): Set<Position> {
  const secondary = new Set<Position>();
  const direct = normalizePosition(player.secondaryPosition);
  if (direct) secondary.add(direct);
  for (const position of player.secondaryPositions ?? []) {
    const normalized = normalizePosition(position);
    if (normalized) secondary.add(normalized);
  }
  return secondary;
}

function twoWayEligibleScopes(player: EffectiveRatingsPlayer): Set<'catcher' | 'infield' | 'outfield'> {
  const scopes = new Set<'catcher' | 'infield' | 'outfield'>();
  const traits = new Set(playerTraits(player));
  for (const [trait, mapped] of Object.entries(TWO_WAY_TRAIT_POSITION)) {
    if (!traits.has(trait)) continue;
    if (mapped === 'C') scopes.add('catcher');
    if (mapped === 'IF') scopes.add('infield');
    if (mapped === 'OF') scopes.add('outfield');
  }
  return scopes;
}

function placementClass(player: EffectiveRatingsPlayer, pos: Position): 'primary' | 'secondary' | 'other' {
  if (primaryPosition(player) === pos) return 'primary';
  if (secondaryPositions(player).has(pos)) return 'secondary';
  const scope = positionScope(pos);
  if (scope && twoWayEligibleScopes(player).has(scope)) return 'secondary';
  return 'other';
}

function guideExplicitReduction(entry: TraitMatrixEntry): number {
  if (entry.effect.kind !== 'fieldingPenaltyReduction') return 0;
  return entry.effect.reductionPct / 100;
}

function fieldingPenaltyReduction(player: EffectiveRatingsPlayer, pos: Position, eligibility: 'primary' | 'secondary' | 'other'): number {
  if (eligibility !== 'secondary') return 0;
  const traits = new Set(playerTraits(player));
  let reduction = 0;
  for (const entry of TRAIT_INTERACTION_MATRIX) {
    if (!traits.has(entry.name) || entry.effect.kind !== 'fieldingPenaltyReduction') continue;
    const ctx: GameContext = {
      pressure: 'none',
      runnersOn: false,
      risp: false,
      opposingHand: 'R',
      inning: 1,
      playingPosition: pos,
    };
    if (predicatesActive(entry, ctx)) {
      reduction = Math.max(reduction, guideExplicitReduction(entry));
    }
  }
  return reduction;
}

function clampLikelihood(value: number): number {
  return Math.max(
    DEFENSIVE_PLACEMENT_SCALING.minLikelihood,
    Math.min(DEFENSIVE_PLACEMENT_SCALING.maxLikelihood, value),
  );
}

export function effectiveRatings(
  p: EffectiveRatingsPlayer,
  state: PlayerState,
  ctx: GameContext,
  potency: PotencyTier = 'L2',
): Ratings {
  let ratings = baseRatings(p);
  ratings = addRatings(ratings, traitDeltas(p, ctx, potency, 'self'));
  if (ctx.opposingPlayer) {
    ratings = addRatings(ratings, traitDeltas(ctx.opposingPlayer, ctx, potency, 'opponent'));
  }
  const mojoDelta = mojoModifier(state.mojo, ctx.pressure);
  ratings = addRatings(ratings, Object.fromEntries(ATTRS.map((attr) => [attr, mojoDelta])) as Partial<Record<Attr, number>>);
  ratings = subtractAll(ratings, fatigueDecay(p, state, ctx, potency));
  return ratings;
}

export function defensivePlacementRisk(p: EffectiveRatingsPlayer, pos: Position): PlacementRisk {
  const chanceFrequency = POSITION_CHANCE_FREQUENCY[pos];
  const eligibility = placementClass(p, pos);
  const reduction = fieldingPenaltyReduction(p, pos, eligibility);
  const baseMultiplier = DEFENSIVE_POSITION_PENALTY_MULTIPLIER[eligibility];
  const penaltyMultiplier = eligibility === 'secondary'
    ? 1 + (baseMultiplier - 1) * (1 - reduction)
    : baseMultiplier;
  const fielding = valueFrom(p, 'FLD', 'fielding');
  const arm = pos === 'SP' || pos === 'RP' || pos === 'CP' ? valueFrom(p, 'ARM', 'arm') || 99 : valueFrom(p, 'ARM', 'arm');
  const speed = valueFrom(p, 'SPD', 'speed');
  const errorLikelihood = clampLikelihood((
    DEFENSIVE_PLACEMENT_SCALING.errorBase
    + (100 - fielding) * DEFENSIVE_PLACEMENT_SCALING.errorFieldingWeight
    + (100 - arm) * DEFENSIVE_PLACEMENT_SCALING.errorArmWeight
  ) * penaltyMultiplier);
  const spectacularLikelihood = clampLikelihood(
    DEFENSIVE_PLACEMENT_SCALING.spectacularBase
    + fielding * DEFENSIVE_PLACEMENT_SCALING.spectacularFieldingWeight
    + speed * DEFENSIVE_PLACEMENT_SCALING.spectacularSpeedWeight,
  );
  const outOfPositionMojoCost = eligibility === 'other'
    ? OUT_OF_POSITION_MOJO_PENALTY * DEFENSIVE_MOJO_DRIFT_STEPS.down
    : 0;
  const expectedMojoDriftPerGame = chanceFrequency * (
    spectacularLikelihood * DEFENSIVE_MOJO_DRIFT_STEPS.up
    - errorLikelihood * DEFENSIVE_MOJO_DRIFT_STEPS.down
  ) - outOfPositionMojoCost;
  return {
    chanceFrequency,
    errorLikelihood,
    spectacularLikelihood,
    expectedMojoDriftPerGame,
  };
}
