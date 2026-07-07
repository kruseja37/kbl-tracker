import { IV_CURVES, type AttributeCurve, type AttributeCurveEntry, type IVAttr, type PositionKey, type PositionCurveBlock } from '../data/ivCurves';
import { AUX_PRICING, PITCH_COSTS, TRAIT_PRICING, type PitchCost, type PitchType, type PricedAttr, type TraitPricingEntry } from '../data/traitPricing';
import {
  BAT_USAGE_ATTRS,
  PITCH_ATTRS,
  PITCHER_NEUTRAL_HITTER_BLOCK,
  PITCHER_ROLES,
  POTENCY_SCALE,
  TWO_WAY_ARM_BY_TIER,
  TWO_WAY_TRAIT_POSITION,
  TWO_WAY_USAGE,
  deriveUsageWeights,
  type PitcherRoleKey,
  type PotencyTier,
  type UsageAttr,
} from '../data/rosterEngineConstants';

type AttrRatings = Partial<Record<IVAttr, number>>;
type AttrCells = Partial<Record<IVAttr, number>>;
type CurveBlock = Partial<Record<IVAttr, AttributeCurveEntry>>;
type TraitInput = { trait1?: string; trait2?: string } | string[] | undefined;

export interface IVPlayerInput {
  id?: string;
  name?: string;
  isPitcher: boolean;
  bats?: string;
  primaryPosition?: string;
  secondaryPosition?: string | null;
  pitcherRole?: string;
  curveBlock?: string;
  ratings?: AttrRatings;
  batterRatings?: {
    power: number;
    contact: number;
    speed: number;
    fielding: number;
    arm?: number;
  };
  pitcherRatings?: {
    velocity: number;
    junk: number;
    accuracy: number;
  };
  traits?: TraitInput;
  arsenal?: string[];
  armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
}

export interface IVLayerBreakdown {
  total: number;
  attributes: number;
  handed: number;
  traits: number;
  pitches: number;
  secondary: number;
  angle: number;
  pitchingAttributes?: number;
  battingAttributes?: number;
  twoWayUnlock?: number;
  usageWeights?: Record<UsageAttr, number>;
  effectiveUsage?: Record<UsageAttr, number>;
  hitterCurveBlock?: string;
  fieldingCurveBlock?: string;
}

export interface IVResult {
  rawIV: number;
  kblIV: number;
  raw: IVLayerBreakdown;
  kbl: IVLayerBreakdown;
}

const ATTRS8: readonly IVAttr[] = ['POW', 'CON', 'SPD', 'FLD', 'ARM', 'VEL', 'JNK', 'ACC'] as const;
const TRAIT_NAME_FIXES: Record<string, string> = {
  Clitch: 'Clutch',
  'K Neglecter': 'K Neglector',
  'Off-speed Hitter': 'Off-Speed Hitter',
};

function isPitcherRole(value: string | undefined): value is PitcherRoleKey {
  return !!value && (PITCHER_ROLES as readonly string[]).includes(value);
}

function isPositionKey(value: string): value is PositionKey {
  return Object.prototype.hasOwnProperty.call(IV_CURVES, value);
}

function cloneBreakdown(layer: IVLayerBreakdown): IVLayerBreakdown {
  return {
    ...layer,
    usageWeights: layer.usageWeights ? { ...layer.usageWeights } : undefined,
    effectiveUsage: layer.effectiveUsage ? { ...layer.effectiveUsage } : undefined,
  };
}

export function roundup(value: number): number {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return rounded >= 0 ? Math.ceil(rounded) : Math.floor(rounded);
}

export function twoSegment(rating: number, curve: AttributeCurve): number {
  const span1 = (curve.mid - curve.min) ** curve.curve1;
  const seg1 = curve.midSal * Math.max(rating - curve.min, 0) ** curve.curve1 / span1;
  const top = curve.sal100 - curve.midSal * Math.max(100 - curve.min, 0) ** curve.curve1 / span1;
  if (curve.mid >= 100) {
    return seg1;
  }
  const seg2 = top * Math.max(rating - curve.mid, 0) ** curve.curve2 / (100 - curve.mid) ** curve.curve2;
  return seg1 + seg2;
}

export function attrCell(rating: number, entry: AttributeCurveEntry): number {
  const primary = entry.primary;
  if (rating <= primary.min) {
    const sub = entry.subMin;
    if (!sub) {
      return 0;
    }
    const reflected = 100 - 100 * (rating - sub.min) / (primary.min - sub.min);
    return roundup(twoSegment(reflected, sub));
  }
  return roundup(twoSegment(rating, primary));
}

export function marginal(rating: number, delta: number, entry: AttributeCurveEntry): number {
  return twoSegment(rating + delta, entry.primary) - twoSegment(rating, entry.primary);
}

function blockAttributes(curves: Record<PositionKey, PositionCurveBlock>, key: PositionKey): CurveBlock {
  return curves[key].attributes;
}

function requireCurve(block: CurveBlock, attr: IVAttr, context: string): AttributeCurveEntry {
  const entry = block[attr];
  if (!entry) {
    throw new Error(`IV curve missing ${context}/${attr}`);
  }
  return entry;
}

function attrCellFor(block: CurveBlock, attr: IVAttr, rating: number, context: string): number {
  return attrCell(rating, requireCurve(block, attr, context));
}

function marginalFor(block: CurveBlock, attr: IVAttr, rating: number, delta: number, context: string): number {
  return marginal(rating, delta, requireCurve(block, attr, context));
}

function normalizeTraits(input: TraitInput): string[] {
  if (!input) {
    return [];
  }
  const values = Array.isArray(input) ? input : [input.trait1, input.trait2];
  return values
    .filter((trait): trait is string => typeof trait === 'string' && trait.length > 0)
    .map((trait) => TRAIT_NAME_FIXES[trait] ?? trait);
}

function traitMap(entries: readonly TraitPricingEntry[]): Map<string, TraitPricingEntry> {
  return new Map(entries.map((entry) => [entry.name, entry]));
}

function mapBatterRatings(input: IVPlayerInput): AttrRatings {
  if (input.ratings) {
    return { ...input.ratings };
  }
  const ratings = input.batterRatings;
  if (!ratings) {
    throw new Error(`IV input ${input.id ?? input.name ?? '(unknown)'} missing batterRatings`);
  }
  return {
    POW: ratings.power,
    CON: ratings.contact,
    SPD: ratings.speed,
    FLD: ratings.fielding,
    ARM: ratings.arm ?? 0,
  };
}

function mapPitcherRatings(input: IVPlayerInput): AttrRatings {
  const ratings = input.pitcherRatings;
  if (!ratings) {
    throw new Error(`IV input ${input.id ?? input.name ?? '(unknown)'} missing pitcherRatings`);
  }
  return {
    VEL: ratings.velocity,
    JNK: ratings.junk,
    ACC: ratings.accuracy,
  };
}

function resolveBlockKey(input: IVPlayerInput): PositionKey {
  if (input.curveBlock && isPositionKey(input.curveBlock)) {
    return input.curveBlock;
  }
  if (input.isPitcher) {
    if (!isPitcherRole(input.pitcherRole)) {
      throw new Error(`IV input ${input.id ?? input.name ?? '(unknown)'} has invalid pitcherRole ${input.pitcherRole}`);
    }
    return input.pitcherRole;
  }
  const pos = input.primaryPosition === 'DH' ? '1B' : input.primaryPosition;
  if (!pos || !isPositionKey(pos)) {
    throw new Error(`IV input ${input.id ?? input.name ?? '(unknown)'} has invalid position ${input.primaryPosition}`);
  }
  return pos;
}

function hasTwoWayTrait(traits: readonly string[]): boolean {
  return traits.some((trait) => trait in TWO_WAY_TRAIT_POSITION);
}

function twoWayTraitPosition(trait: string): PositionKey | undefined {
  return (TWO_WAY_TRAIT_POSITION as Record<string, PositionKey | undefined>)[trait];
}

function pitcherHitterBlock(traits: readonly string[]): PositionKey {
  for (const trait of traits) {
    const pos = twoWayTraitPosition(trait);
    if (pos) {
      return pos;
    }
  }
  return PITCHER_NEUTRAL_HITTER_BLOCK;
}

function scaleDelta(value: number, polarity: TraitPricingEntry['polarity'], potency: PotencyTier): number {
  if (value === 0 || potency === 'L2') {
    return value;
  }
  const scale = polarity === 'negative' ? POTENCY_SCALE.standardInverted[potency] : POTENCY_SCALE.positives[potency];
  return value * scale;
}

function scaledDeltas(entry: TraitPricingEntry, potency: PotencyTier): Record<PricedAttr, number> {
  const out = { ...entry.deltas };
  for (const attr of ATTRS8) {
    out[attr] = scaleDelta(out[attr], entry.polarity, potency);
  }
  return out;
}

function pricedComponent(
  deltas: Partial<Record<IVAttr, number>>,
  multipliers: Partial<Record<IVAttr, number>> | undefined,
  flat: number,
  ratings: AttrRatings,
  block: CurveBlock,
  cells: AttrCells,
  deltaBlock: CurveBlock | undefined,
  context: string,
): number {
  const dBlock = deltaBlock ?? block;
  const hitterShaped = !!block.ARM;
  let total = flat;
  for (const attr of ['POW', 'CON', 'SPD', 'FLD'] as const) {
    const delta = deltas[attr] ?? 0;
    const rating = ratings[attr];
    if (delta !== 0 && rating !== undefined) {
      total += marginalFor(dBlock, attr, rating, delta, context);
    }
  }
  const armDelta = deltas.ARM ?? 0;
  if (hitterShaped && armDelta !== 0 && ratings.ARM !== undefined) {
    total += marginalFor(dBlock, 'ARM', ratings.ARM, armDelta, context);
  }
  if (!hitterShaped) {
    for (const attr of PITCH_ATTRS) {
      const delta = deltas[attr] ?? 0;
      const rating = ratings[attr];
      if (delta !== 0 && rating !== undefined) {
        total += marginalFor(dBlock, attr, rating, delta, context);
      }
    }
  }
  if (multipliers) {
    for (const attr of ATTRS8) {
      const mult = multipliers[attr] ?? 1;
      const cell = cells[attr];
      if (mult !== 1 && cell !== undefined) {
        total += cell * mult - cell;
      }
    }
  }
  return roundup(total);
}

function emptyLayer(): IVLayerBreakdown {
  return {
    total: 0,
    attributes: 0,
    handed: 0,
    traits: 0,
    pitches: 0,
    secondary: 0,
    angle: 0,
  };
}

function computeRawLayer(
  input: IVPlayerInput,
  curves: Record<PositionKey, PositionCurveBlock>,
  traitsByName: Map<string, TraitPricingEntry>,
  pitches: Record<PitchType, PitchCost>,
  potency: PotencyTier,
): IVLayerBreakdown {
  const blockKey = resolveBlockKey(input);
  const block = blockAttributes(curves, blockKey);
  const batRatings = mapBatterRatings(input);
  const ratings = input.isPitcher ? { ...batRatings, ...mapPitcherRatings(input) } : batRatings;
  if (input.isPitcher) {
    delete ratings.ARM;
  }
  const cells: AttrCells = {};
  for (const attr of ATTRS8) {
    const rating = ratings[attr];
    if (rating !== undefined && block[attr]) {
      cells[attr] = attrCellFor(block, attr, rating, blockKey);
    }
  }
  const parts = emptyLayer();
  parts.attributes = Object.values(cells).reduce((sum, value) => sum + (value ?? 0), 0);
  if (input.bats === 'S') {
    parts.handed = pricedComponent(
      AUX_PRICING.switchHitter.deltas,
      undefined,
      AUX_PRICING.switchHitter.flatFee,
      ratings,
      block,
      cells,
      undefined,
      blockKey,
    );
  }
  for (const trait of normalizeTraits(input.traits)) {
    const entry = traitsByName.get(trait);
    if (!entry) {
      throw new Error(`Unknown IV trait ${trait}`);
    }
    const deltaBlock = blockKey === 'SP/RP' && entry.polarity === 'negative'
      ? blockAttributes(curves, 'RP')
      : undefined;
    parts.traits += pricedComponent(
      // T4-FIX X1: rawIV is exact workbook semantics (§3.5) and is structurally
      // potency-neutral at L2. Caller potency only affects the kblIV usage layer.
      scaledDeltas(entry, 'L2'),
      entry.multipliers,
      entry.flatFee,
      ratings,
      block,
      cells,
      deltaBlock,
      blockKey,
    );
  }
  for (const code of input.arsenal ?? []) {
    const pitch = pitches[code as PitchType];
    if (!pitch) {
      throw new Error(`Unknown pitch code ${code}`);
    }
    let cost = pitch.flatFee;
    for (const attr of PITCH_ATTRS) {
      const mult = pitch.multipliers[attr] ?? 1;
      const cell = cells[attr];
      if (mult !== 1 && cell !== undefined) {
        cost += cell * mult - cell;
      }
    }
    parts.pitches += roundup(cost);
  }
  if (!input.isPitcher && input.secondaryPosition) {
    const row = AUX_PRICING.secondaryPositions[input.secondaryPosition];
    if (row) {
      parts.secondary = pricedComponent(row.deltas, undefined, row.flatFee, ratings, block, cells, undefined, blockKey);
    }
  }
  if (input.armSlot === 'Sub') {
    // T4-FIX X3: parity keeps the analyzer's current edge behavior. A synthetic
    // hitter with Sub armSlot pays the flat $4,000 while VEL/JNK multipliers are
    // vacuous because hitter blocks have no pitch cells; no stock hitter carries it.
    const row = AUX_PRICING.armAngle.Sub;
    parts.angle = pricedComponent(row.deltas, row.multipliers, row.flatFee, ratings, block, cells, undefined, blockKey);
  }
  parts.total = parts.attributes + parts.handed + parts.traits + parts.pitches + parts.secondary + parts.angle;
  return parts;
}

function pitcherAttrCellKbl(
  curves: Record<PositionKey, PositionCurveBlock>,
  role: PitcherRoleKey,
  attr: IVAttr,
  rating: number,
): number {
  return attrCellFor(blockAttributes(curves, role), attr, rating, role);
}

function pitcherAttrMarginalKbl(
  curves: Record<PositionKey, PositionCurveBlock>,
  role: PitcherRoleKey,
  attr: IVAttr,
  rating: number,
  delta: number,
): number {
  return marginalFor(blockAttributes(curves, role), attr, rating, delta, role);
}

interface KblCells {
  role: PitcherRoleKey;
  pitchBlock: CurveBlock;
  hitterBlock: CurveBlock;
  fieldingBlock: CurveBlock;
  pitchCells: AttrCells;
  batCells: AttrCells;
  fieldingInterpolated: boolean;
  hitterCurveBlock: PositionKey;
  fieldingCurveBlock: string;
  isTwoWay: boolean;
}

function pitcherKblCells(input: IVPlayerInput, curves: Record<PositionKey, PositionCurveBlock>): KblCells {
  if (!isPitcherRole(input.pitcherRole)) {
    throw new Error(`IV input ${input.id ?? input.name ?? '(unknown)'} has invalid pitcherRole ${input.pitcherRole}`);
  }
  const role = input.pitcherRole;
  const traits = normalizeTraits(input.traits);
  const hitterCurveBlock = pitcherHitterBlock(traits);
  const pitchBlock = blockAttributes(curves, role);
  const hitterBlock = blockAttributes(curves, hitterCurveBlock);
  const isTwoWay = hasTwoWayTrait(traits);
  const bat = mapBatterRatings(input);
  const pit = mapPitcherRatings(input);
  const pitchCells: AttrCells = {};
  for (const attr of PITCH_ATTRS) {
    pitchCells[attr] = pitcherAttrCellKbl(curves, role, attr, pit[attr] ?? 0);
  }
  const batCells: AttrCells = {
    POW: attrCellFor(hitterBlock, 'POW', bat.POW ?? 0, hitterCurveBlock),
    CON: attrCellFor(hitterBlock, 'CON', bat.CON ?? 0, hitterCurveBlock),
    SPD: attrCellFor(hitterBlock, 'SPD', bat.SPD ?? 0, hitterCurveBlock),
  };
  const fieldingInterpolated = false;
  const fieldingBlock = isTwoWay ? hitterBlock : pitchBlock;
  batCells.FLD = fieldingInterpolated
    ? pitcherAttrCellKbl(curves, role, 'FLD', bat.FLD ?? 0)
    : attrCellFor(fieldingBlock, 'FLD', bat.FLD ?? 0, isTwoWay ? hitterCurveBlock : role);
  return {
    role,
    pitchBlock,
    hitterBlock,
    fieldingBlock,
    pitchCells,
    batCells,
    fieldingInterpolated,
    hitterCurveBlock,
    fieldingCurveBlock: fieldingInterpolated ? 'SP/RP interpolated' : isTwoWay ? hitterCurveBlock : role,
    isTwoWay,
  };
}

function weightedComponent(
  curves: Record<PositionKey, PositionCurveBlock>,
  deltas: Partial<Record<IVAttr, number>>,
  multipliers: Partial<Record<IVAttr, number>> | undefined,
  flat: number,
  ratings: AttrRatings,
  cells: KblCells,
  weights: Record<UsageAttr, number>,
): number {
  let total = flat;
  for (const attr of ['POW', 'CON', 'SPD'] as const) {
    const delta = deltas[attr] ?? 0;
    const rating = ratings[attr];
    if (delta !== 0 && rating !== undefined) {
      total += marginalFor(cells.hitterBlock, attr, rating, delta, cells.hitterCurveBlock) * weights[attr];
    }
  }
  const fldDelta = deltas.FLD ?? 0;
  if (fldDelta !== 0 && ratings.FLD !== undefined) {
    total += cells.fieldingInterpolated
      ? pitcherAttrMarginalKbl(curves, cells.role, 'FLD', ratings.FLD, fldDelta)
      : marginalFor(cells.fieldingBlock, 'FLD', ratings.FLD, fldDelta, cells.fieldingCurveBlock);
  }
  for (const attr of PITCH_ATTRS) {
    const delta = deltas[attr] ?? 0;
    const rating = ratings[attr];
    if (delta !== 0 && rating !== undefined) {
      total += pitcherAttrMarginalKbl(curves, cells.role, attr, rating, delta);
    }
  }
  if (multipliers) {
    for (const attr of ['POW', 'CON', 'SPD'] as const) {
      const mult = multipliers[attr] ?? 1;
      const cell = cells.batCells[attr] ?? 0;
      if (mult !== 1) {
        total += (cell * mult - cell) * weights[attr];
      }
    }
    const fldMult = multipliers.FLD ?? 1;
    const fldCell = cells.batCells.FLD ?? 0;
    if (fldMult !== 1) {
      total += fldCell * fldMult - fldCell;
    }
    for (const attr of PITCH_ATTRS) {
      const mult = multipliers[attr] ?? 1;
      const cell = cells.pitchCells[attr] ?? 0;
      if (mult !== 1) {
        total += cell * mult - cell;
      }
    }
  }
  return roundup(total);
}

function twoWayTraitComponent(
  traitName: string,
  input: IVPlayerInput,
  trait: TraitPricingEntry,
  cells: KblCells,
  weights: Record<UsageAttr, number>,
  potency: PotencyTier,
): number {
  const bat = mapBatterRatings(input);
  let total = 0;
  for (const attr of ['POW', 'CON', 'SPD'] as const) {
    total += (cells.batCells[attr] ?? 0) * (TWO_WAY_USAGE - weights[attr]);
  }
  const fldDelta = scaleDelta(trait.deltas.FLD, trait.polarity, potency);
  if (fldDelta) {
    total += marginalFor(cells.hitterBlock, 'FLD', bat.FLD ?? 0, fldDelta, traitName);
  }
  total += attrCellFor(cells.hitterBlock, 'ARM', TWO_WAY_ARM_BY_TIER[potency], traitName);
  return roundup(total);
}

function computeKblLayer(
  input: IVPlayerInput,
  curves: Record<PositionKey, PositionCurveBlock>,
  traitsByName: Map<string, TraitPricingEntry>,
  pitches: Record<PitchType, PitchCost>,
  potency: PotencyTier,
): IVLayerBreakdown {
  if (!input.isPitcher) {
    throw new Error('kbl pitcher layer called for non-pitcher');
  }
  const traits = normalizeTraits(input.traits);
  const cells = pitcherKblCells(input, curves);
  const weights = deriveUsageWeights(cells.role);
  const parts = emptyLayer();
  parts.pitchingAttributes = PITCH_ATTRS.reduce((sum, attr) => sum + (cells.pitchCells[attr] ?? 0), 0);
  parts.battingAttributes = roundup(BAT_USAGE_ATTRS.reduce((sum, attr) => {
    return sum + (cells.batCells[attr] ?? 0) * weights[attr];
  }, 0));
  parts.attributes = parts.pitchingAttributes + parts.battingAttributes;
  const ratings = { ...mapBatterRatings(input), ...mapPitcherRatings(input) };
  if (input.bats === 'S') {
    parts.handed = weightedComponent(
      curves,
      AUX_PRICING.switchHitter.deltas,
      undefined,
      AUX_PRICING.switchHitter.flatFee,
      ratings,
      cells,
      weights,
    );
  }
  for (const traitName of traits) {
    const entry = traitsByName.get(traitName);
    if (!entry) {
      throw new Error(`Unknown IV trait ${traitName}`);
    }
    if (traitName in TWO_WAY_TRAIT_POSITION) {
      const value = twoWayTraitComponent(traitName, input, entry, cells, weights, potency);
      parts.twoWayUnlock = (parts.twoWayUnlock ?? 0) + value;
      parts.traits += value;
      continue;
    }
    parts.traits += weightedComponent(
      curves,
      scaledDeltas(entry, potency),
      entry.multipliers,
      entry.flatFee,
      ratings,
      cells,
      weights,
    );
  }
  for (const code of input.arsenal ?? []) {
    const pitch = pitches[code as PitchType];
    if (!pitch) {
      throw new Error(`Unknown pitch code ${code}`);
    }
    let cost = pitch.flatFee;
    for (const attr of PITCH_ATTRS) {
      const mult = pitch.multipliers[attr] ?? 1;
      const cell = cells.pitchCells[attr] ?? 0;
      if (mult !== 1) {
        cost += cell * mult - cell;
      }
    }
    parts.pitches += roundup(cost);
  }
  if (input.armSlot === 'Sub') {
    const row = AUX_PRICING.armAngle.Sub;
    let cost = row.flatFee;
    for (const attr of PITCH_ATTRS) {
      const mult = row.multipliers[attr] ?? 1;
      const cell = cells.pitchCells[attr] ?? 0;
      if (mult !== 1) {
        cost += cell * mult - cell;
      }
    }
    parts.angle = roundup(cost);
  }
  parts.total = parts.attributes + parts.handed + parts.traits + parts.pitches + parts.secondary + parts.angle;
  parts.usageWeights = weights;
  parts.effectiveUsage = cells.isTwoWay
    ? { POW: TWO_WAY_USAGE, CON: TWO_WAY_USAGE, SPD: TWO_WAY_USAGE, FLD: TWO_WAY_USAGE }
    : { ...weights };
  parts.hitterCurveBlock = cells.hitterCurveBlock;
  parts.fieldingCurveBlock = cells.fieldingCurveBlock;
  parts.twoWayUnlock = parts.twoWayUnlock ?? 0;
  return parts;
}

export function computeIV(
  player: IVPlayerInput,
  curves: Record<PositionKey, PositionCurveBlock> = IV_CURVES,
  traitEntries: readonly TraitPricingEntry[] = TRAIT_PRICING,
  potency: PotencyTier = 'L2',
): IVResult {
  const traitsByName = traitMap(traitEntries);
  const raw = computeRawLayer(player, curves, traitsByName, PITCH_COSTS, potency);
  const kbl = player.isPitcher
    ? computeKblLayer(player, curves, traitsByName, PITCH_COSTS, potency)
    : cloneBreakdown(raw);
  return {
    rawIV: raw.total,
    kblIV: kbl.total,
    raw,
    kbl,
  };
}

/**
 * CHEM-POTENCY (JK ruling 4, 2026-07-02): the engine-currency dollar value of re-tiering
 * ONE trait on ONE holder — the primitive under the chemistry tipping premium
 * (chemistryTierValue.ts). ADDITIVE EXPORT: no existing computeIV path changes and the
 * frozen oracle (G1-G10) never reaches this function.
 *
 * Semantics:
 * - `flatFee`/`multipliers` are potency-invariant (CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC
 *   §2.5/§3.3), so they cancel in the tier difference and are excluded here.
 * - Pitchers price at raw-layer semantics (the kbl usage-weighted trait treatment is not
 *   reproduced) — advice-grade by design; the oracle pins nothing on this surface.
 * - Negative traits need no polarity hand-flip: their scaled deltas carry the sign, so
 *   L1→L3 on a negative trait prices positive (the malus shrinks).
 * - Unknown traits and unpriceable inputs return 0, matching traitPotencies' skip
 *   semantics — advice surfaces must not throw on imperfect league data.
 */
export function traitPotencyDollarDelta(
  player: IVPlayerInput,
  traitName: string,
  fromTier: PotencyTier,
  toTier: PotencyTier,
  curves: Record<PositionKey, PositionCurveBlock> = IV_CURVES,
  traitEntries: readonly TraitPricingEntry[] = TRAIT_PRICING,
): number {
  if (fromTier === toTier) {
    return 0;
  }
  const entry = traitMap(traitEntries).get(TRAIT_NAME_FIXES[traitName] ?? traitName);
  if (!entry) {
    return 0;
  }
  try {
    const blockKey = resolveBlockKey(player);
    const block = blockAttributes(curves, blockKey);
    const batRatings = mapBatterRatings(player);
    const ratings = player.isPitcher ? { ...batRatings, ...mapPitcherRatings(player) } : batRatings;
    if (player.isPitcher) {
      delete ratings.ARM;
    }
    const deltaBlock = blockKey === 'SP/RP' && entry.polarity === 'negative'
      ? blockAttributes(curves, 'RP')
      : undefined;
    const priceAt = (tier: PotencyTier): number =>
      pricedComponent(scaledDeltas(entry, tier), undefined, 0, ratings, block, {}, deltaBlock, blockKey);
    return priceAt(toTier) - priceAt(fromTier);
  } catch {
    return 0;
  }
}
