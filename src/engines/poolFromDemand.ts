/**
 * POOL-FROM-DEMAND — Mode A extraction (JK two-mode ruling 2026-07-02; design:
 * FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §6.1).
 *
 * Once every GM locks a team archetype + a 22-slot player-archetype design, this engine
 * extracts a right-sized draft pool from a much LARGER universe (thousands of uploaded
 * players) that (a) provisions every design ask WITH CONTEST MULTIPLICITY — completion is
 * guaranteed, design satisfaction stays competitive — and (b) unions the C1B archetype-
 * feasibility extraction so every selected team archetype stays draftable and the C3-era
 * floors/liquidity hold. Shortfalls are named in plain language ("your league wants 6
 * lefty glove-first shortstops; the uploaded universe holds 3").
 *
 * A COMPOSITION of audited parts, deliberately: the classifier types the universe, cell
 * reservations satisfy the asks, `extractDraftPool` (C1B) carries archetype floors +
 * balance verdicts, numeric-grade source shaping builds the middle-class supply curve,
 * G1 seating verifies every club can legally complete, and `evaluateRosterDesign` verifies
 * every human design against the final pool. CPU/shill clubs contribute NO shape-specific
 * cells — the extractor's floors and G1 seating guarantee their completion.
 */

import {
  classifyPlayerArchetype,
  type ClassifiableProfile,
  type ShapeClassification,
} from './playerArchetypeClassifier';
import {
  buildDefaultDesignSlots,
  evaluateRosterDesign,
  seatAllClubs,
  type DesignFeasibilityResult,
  type DesignPoolPlayer,
  type DesignSlot,
  type SlotPreference,
} from './rosterDesignFeasibility';
import { extractDraftPool, type ExtractedPool } from './draftPoolExtractor';
import { archetypeFitScorer, type RosterPosture, type SimPlayer } from './archetypeBalanceSimulator';
import { historicalToSimArchetype } from './draftabilityRanker';
import { poolDemandModel } from './auctionPoolSizing';
import { scoreSmb4Player } from './smb4GradeEmulator';
import type { HistoricalArchetype } from '../data/historicalArchetypes';
import type { TierKey } from '../data/tierParams';
import {
  canCover,
  canRelieve,
  canStart,
  isCloser,
  LEGAL_ROSTER,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';

/** A universe player: sim/economy shape + the whole classifiable profile. */
export interface DemandUniversePlayer extends SimPlayer {
  name?: string;
  profile: ClassifiableProfile;
}

export interface TeamDesignInput {
  teamId: string;
  slots: DesignSlot[];
}

export const POOL_FROM_DEMAND_TUNING = {
  /**
   * Provision per contested cell: ceil(asks × this). Multiplicity, not exclusivity —
   * two GMs asking for the same cell get FOUR candidates to fight over, not a promise.
   * §16 Simulation-Gate adjustable.
   */
  contestMultiplier: 2,
} as const;

/**
 * Captain-ruled hard-position supply slack. A legal-minimum position must be extracted at
 * teams * minimum + max(minimumSlack, ceil(teams / teamsPerSlack)); tune here only.
 */
export const POSITION_SUPPLY_FLOOR_TUNING = {
  minimumSlack: 2,
  teamsPerSlack: 3,
} as const;

export type PositionSupplyFloorKind =
  | 'field-position'
  | 'catcher-depth'
  | 'starter'
  | 'reliever'
  | 'closer';

export interface PositionSupplyFloorTarget {
  kind: PositionSupplyFloorKind;
  position: string;
  label: string;
  minimumPerTeam: number;
  teams: number;
  slack: number;
  needed: number;
}

export interface PositionSupplyFloorResult extends PositionSupplyFloorTarget {
  available: number;
  missing: number;
}

export interface DemandCellReport {
  /** The ask as keyed: position | shape | serialized hard tags. */
  key: string;
  /** The engine preference that produced the cell; matching is shape/runner-up only. */
  preference: SlotPreference;
  slotIds: string[];
  asks: number;
  wanted: number;
  reserved: number;
}

export interface DemandShortfall {
  key: string;
  /** Structured position key when the shortfall comes from a hard legal-position floor. */
  position?: string;
  wanted: number;
  available: number;
  message: string;
}

export interface PoolFromDemandResult {
  /** The extracted pool (deduped union: cell reservations ∪ the archetype-floors pool). */
  players: DemandUniversePlayer[];
  size: number;
  /** The C1B extraction underneath (verdicts/balance/notes for the selected archetypes). */
  floors: ExtractedPool;
  cells: DemandCellReport[];
  shortfalls: DemandShortfall[];
  /** Every human design re-verified against the FINAL pool (the §6.1 hub-drift check). */
  designVerdicts: { teamId: string; result: DesignFeasibilityResult }[];
  /** Hard legal-position floors evaluated against the final extracted pool. */
  positionSupplyFloors: PositionSupplyFloorResult[];
  sizing?: PoolSizingResult;
  g1?: PoolG1Result;
  numericShape?: NumericPoolShapeDiagnostics;
}

export interface ClassifiedDemandPlayer {
  player: DemandUniversePlayer;
  classification: ShapeClassification;
}

export const POOL_SIZE_MULTIPLIER_STOPS = [1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5] as const;
/**
 * CAPFIX iteration 3 final tune: one-shot sequential nomination needs the maximum approved
 * surplus stop so an 8-club room retains legal late-draft shape coverage without a safety net.
 */
export const DEFAULT_POOL_SIZE_MULTIPLIER = 1.5;
export const POOL_QUALITY_CENTER_STOPS = [64, 66, 68, 70, 72, 74, 76] as const;
export type PoolQualityCenter = typeof POOL_QUALITY_CENTER_STOPS[number];
export const DEFAULT_POOL_QUALITY_CENTER: PoolQualityCenter = 68;

export type PoolBalancePresetKey = 'grounded' | 'balanced' | 'juiced';
export type PoolSourceMode = 'team-roster-priority' | 'full-pool';

export interface NumericPoolShapeTuning {
  lowTailMax: number;
  middleMin: number;
  middleMax: number;
  highTailMin: number;
  superstarTailMin: number;
  highTailCap: number;
  superstarTailCap: number;
  targetMiddleMass: number;
  targetLowTailShare: number;
  lowTailRepairCap: number;
  maxRepairSlackFactor: number;
  poolSlackFactor: number;
  windows: readonly NumericPoolShapeWindow[];
}

export const NUMERIC_POOL_SHAPE_TUNING = {
  lowTailMax: 58,
  middleMin: 58,
  middleMax: 76,
  highTailMin: 76,
  superstarTailMin: 84,
  highTailCap: 0.15,
  superstarTailCap: 0.04,
  targetMiddleMass: 0.70,
  targetLowTailShare: 0.10,
  lowTailRepairCap: 0.18,
  maxRepairSlackFactor: 1.30,
  poolSlackFactor: DEFAULT_POOL_SIZE_MULTIPLIER,
  windows: [
    { id: 'low-tail', label: 'low tail', minInclusive: 0, maxExclusive: 58, targetShare: 0.10 },
    { id: 'middle-low', label: 'middle low', minInclusive: 58, maxExclusive: 64, targetShare: 0.22 },
    { id: 'middle-core', label: 'middle core', minInclusive: 64, maxExclusive: 70, targetShare: 0.28 },
    { id: 'middle-high', label: 'middle high', minInclusive: 70, maxExclusive: 76, targetShare: 0.25 },
    { id: 'high-tail', label: 'high tail', minInclusive: 76, maxExclusive: 84, targetShare: 0.13 },
    { id: 'ultra-high-tail', label: 'ultra high tail', minInclusive: 84, maxExclusive: 101, targetShare: 0.02 },
  ],
} as const satisfies NumericPoolShapeTuning;

export const POOL_BALANCE_PRESETS: Record<PoolBalancePresetKey, NumericPoolShapeTuning> = {
  grounded: {
    ...NUMERIC_POOL_SHAPE_TUNING,
    poolSlackFactor: 1.2,
    highTailCap: 0.10,
    superstarTailCap: 0.02,
    targetMiddleMass: 0.78,
    targetLowTailShare: 0.09,
    lowTailRepairCap: 0.13,
    windows: [
      { id: 'low-tail', label: 'low tail', minInclusive: 0, maxExclusive: 58, targetShare: 0.09 },
      { id: 'middle-low', label: 'middle low', minInclusive: 58, maxExclusive: 64, targetShare: 0.27 },
      { id: 'middle-core', label: 'middle core', minInclusive: 64, maxExclusive: 70, targetShare: 0.31 },
      { id: 'middle-high', label: 'middle high', minInclusive: 70, maxExclusive: 76, targetShare: 0.23 },
      { id: 'high-tail', label: 'high tail', minInclusive: 76, maxExclusive: 84, targetShare: 0.09 },
      { id: 'ultra-high-tail', label: 'ultra high tail', minInclusive: 84, maxExclusive: 101, targetShare: 0.01 },
    ],
  },
  balanced: NUMERIC_POOL_SHAPE_TUNING,
  juiced: {
    ...NUMERIC_POOL_SHAPE_TUNING,
    poolSlackFactor: 1.35,
    highTailCap: 0.20,
    superstarTailCap: 0.05,
    targetMiddleMass: 0.69,
    targetLowTailShare: 0.09,
    lowTailRepairCap: 0.12,
    windows: [
      { id: 'low-tail', label: 'low tail', minInclusive: 0, maxExclusive: 58, targetShare: 0.09 },
      { id: 'middle-low', label: 'middle low', minInclusive: 58, maxExclusive: 64, targetShare: 0.18 },
      { id: 'middle-core', label: 'middle core', minInclusive: 64, maxExclusive: 70, targetShare: 0.26 },
      { id: 'middle-high', label: 'middle high', minInclusive: 70, maxExclusive: 76, targetShare: 0.27 },
      { id: 'high-tail', label: 'high tail', minInclusive: 76, maxExclusive: 84, targetShare: 0.17 },
      { id: 'ultra-high-tail', label: 'ultra high tail', minInclusive: 84, maxExclusive: 101, targetShare: 0.03 },
    ],
  },
} as const;

function clampNumericWindowBoundary(value: number): number {
  return Math.min(101, Math.max(0, value));
}

export function resolvePoolQualityCenter(poolQualityCenter?: number): PoolQualityCenter {
  if (poolQualityCenter === undefined || !Number.isFinite(poolQualityCenter)) {
    return DEFAULT_POOL_QUALITY_CENTER;
  }
  const clamped = Math.min(
    POOL_QUALITY_CENTER_STOPS[POOL_QUALITY_CENTER_STOPS.length - 1],
    Math.max(POOL_QUALITY_CENTER_STOPS[0], poolQualityCenter),
  );
  return POOL_QUALITY_CENTER_STOPS.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - clamped);
    const bestDistance = Math.abs(best - clamped);
    if (candidateDistance < bestDistance) return candidate;
    if (candidateDistance === bestDistance && candidate < best) return candidate;
    return best;
  }, DEFAULT_POOL_QUALITY_CENTER);
}

export function derivePoolQualityTuning(
  tuning: NumericPoolShapeTuning,
  poolQualityCenter?: number,
): NumericPoolShapeTuning {
  const resolvedCenter = resolvePoolQualityCenter(poolQualityCenter);
  const qualityShift = resolvedCenter - DEFAULT_POOL_QUALITY_CENTER;
  if (qualityShift === 0) return tuning;
  return {
    ...tuning,
    lowTailMax: clampNumericWindowBoundary(tuning.lowTailMax + qualityShift),
    middleMin: clampNumericWindowBoundary(tuning.middleMin + qualityShift),
    middleMax: clampNumericWindowBoundary(tuning.middleMax + qualityShift),
    highTailMin: clampNumericWindowBoundary(tuning.highTailMin + qualityShift),
    superstarTailMin: clampNumericWindowBoundary(tuning.superstarTailMin + qualityShift),
    windows: tuning.windows.map((window, index) => ({
      ...window,
      minInclusive: index === 0
        ? 0
        : clampNumericWindowBoundary(window.minInclusive + qualityShift),
      maxExclusive: index === tuning.windows.length - 1
        ? 101
        : clampNumericWindowBoundary(window.maxExclusive + qualityShift),
    })),
  };
}

export function poolBalancePresetTuning(
  preset: PoolBalancePresetKey = 'balanced',
  poolQualityCenter?: number,
): NumericPoolShapeTuning {
  const tuning = POOL_BALANCE_PRESETS[preset] ?? POOL_BALANCE_PRESETS.balanced;
  return poolQualityCenter === undefined
    ? tuning
    : derivePoolQualityTuning(tuning, poolQualityCenter);
}

export interface NumericPoolShapeWindow {
  readonly id: string;
  readonly label: string;
  readonly minInclusive: number;
  readonly maxExclusive: number;
  readonly targetShare: number;
}

export interface NumericPoolQuotaShortfall {
  roleBucket: string;
  windowId: string;
  minInclusive: number;
  maxExclusive: number;
  targetCount: number;
  protectedCount: number;
  selectedCount: number;
  availableCount: number;
}

export interface NumericPoolShapeDiagnostics {
  preset: PoolBalancePresetKey;
  poolQualityCenter: PoolQualityCenter;
  defaultQualityCenter: PoolQualityCenter;
  qualityShift: number;
  shiftedBandWindows: NumericPoolShapeWindow[];
  poolSize: number;
  requiredRosterDemand: number;
  poolSlackFactor: number;
  targetSize: number;
  medianNumericGrade: number | null;
  targetMedianQuality: PoolQualityCenter;
  achievedMedianQuality: number | null;
  achievedMedianDelta: number | null;
  p90NumericGrade: number | null;
  highTailShare: number;
  superstarTailShare: number;
  middleMassShare: number;
  lowTailShare: number;
  barbellIndex: number;
  positionRoleCoverage: Record<string, number>;
  quotaShortfalls: NumericPoolQuotaShortfall[];
  legalCompletionFeasible: boolean | null;
  messages: string[];
  hardKeepCount: number;
  hardKeepOverflowCount: number;
  designHardKeepCount: number;
  identityCriticalCandidateCount: number;
  identityCriticalIncludedCount: number;
  identityCriticalMissingCount: number;
  missingIdentityCriticalReasons: Record<string, string>;
  overTargetReason: string | null;
  hardKeepByBand: Record<string, number>;
  engineGeneratedByBand: Record<string, number>;
  finalPoolByBand: Record<string, number>;
  hardKeepShapeOverflowByBand: Record<string, number>;
  qualityBandTargetCounts: Record<string, number>;
  qualityBandFinalCounts: Record<string, number>;
  qualityBandShortfalls: Record<string, number>;
  qualityCenterShortfallReason: string | null;
  excludedReaddedForLegalityCount: number;
  poolSourceMode: PoolSourceMode;
  selectedTeamRosterCandidateCount: number;
  selectedTeamRosterFinalCount: number;
  fullPoolEligibleCandidateCount: number;
  engineGeneratedFromSelectedTeamRosterCount: number;
  engineGeneratedFromFullPoolCount: number;
  hardKeepFromSelectedTeamRosterCount: number;
  preRepair?: NumericPoolCurveSnapshot;
  postRepair?: NumericPoolCurveSnapshot;
  g1AdditionsByRoleWindow?: Record<string, number>;
  g1RemovalsByRoleWindow?: Record<string, number>;
  g1LowTailAdditionsByRole?: Record<string, number>;
  g1Swaps?: NumericPoolRepairSwap[];
  curveViolations?: NumericPoolCurveViolation[];
  g1AdditionCount?: number;
  g1SwapCount?: number;
}

export interface NumericPoolCurveSnapshot {
  poolSize: number;
  requiredRosterDemand: number;
  poolSlackFactor: number;
  targetSize: number;
  medianNumericGrade: number | null;
  highTailShare: number;
  middleMassShare: number;
  lowTailShare: number;
  barbellIndex: number;
}

export interface NumericPoolRepairSwap {
  addedId: string;
  removedId: string;
  roleBucket: string;
  windowId: string;
  removedRoleBucket: string;
  removedWindowId: string;
}

export interface NumericPoolCurveViolation {
  code: 'LEGALITY_REQUIRES_CURVE_VIOLATION' | 'REPAIR_GROWTH_LIMIT' | 'LOW_TAIL_CAP_EXCEEDED' | 'MIDDLE_MASS_TARGET_MISSED';
  message: string;
}

export interface PoolSizingResult {
  demandBase: number;
  requestedMultiplier: number;
  requestedTarget: number;
  hardFloor: number;
  effectiveTarget: number;
  finalSize: number;
  trimmedCount: number;
  evictedIds: string[];
  injectedIds: string[];
  ceilingTarget: number;
  clamped: boolean;
  messages: string[];
  pinnedHandPicks?: string[];
  excludedHandRemoves?: string[];
}

export interface PoolG1Result {
  holds: boolean;
  assemblies: string[][];
  failing?: { pass: number; blockers: string[]; overrun?: number };
  repairRounds: number;
}

export interface PoolG1RepairResult {
  players: DemandUniversePlayer[];
  g1: PoolG1Result;
  injectedIds: string[];
  evictedIds: string[];
  messages: string[];
  additionsByRoleWindow: Record<string, number>;
  removalsByRoleWindow: Record<string, number>;
  lowTailAdditionsByRole: Record<string, number>;
  swaps: NumericPoolRepairSwap[];
  curveViolations: NumericPoolCurveViolation[];
}

export class PoolTeamsForSizingMissingError extends Error {
  constructor() {
    super('extractPoolFromDemand requires options.teams when sizing the shared draft pool.');
    this.name = 'PoolTeamsForSizingMissingError';
  }
}

function assertPoolMultiplier(multiplier: number): number {
  if (!POOL_SIZE_MULTIPLIER_STOPS.some((stop) => Math.abs(stop - multiplier) < 1e-9)) {
    throw new Error(`poolSizeMultiplier must be one of ${POOL_SIZE_MULTIPLIER_STOPS.join(', ')}`);
  }
  return multiplier;
}

export function resolvePoolSizingTarget(options: {
  teams: number;
  shills?: number;
  poolSizeMultiplier?: number;
  sizeTarget?: number;
}): Pick<PoolSizingResult, 'demandBase' | 'requestedMultiplier' | 'requestedTarget' | 'hardFloor' | 'effectiveTarget' | 'ceilingTarget' | 'clamped'> {
  const teams = Math.max(0, Math.floor(options.teams));
  const model = poolDemandModel(teams, options.shills ?? 0);
  const demandBase = model.baseSlots + model.expectedShillWins;
  const ceilingTarget = Math.ceil(1.5 * demandBase);
  const multiplier = assertPoolMultiplier(options.poolSizeMultiplier ?? DEFAULT_POOL_SIZE_MULTIPLIER);
  const rawRequested = options.sizeTarget !== undefined
    ? Math.max(0, Math.ceil(options.sizeTarget))
    : Math.ceil(multiplier * demandBase);
  const requestedTarget = Math.min(rawRequested, ceilingTarget);
  const hardFloor = Math.max(model.baseSlots, model.feasibilityFloor) + model.expectedShillWins;
  const effectiveTarget = Math.max(requestedTarget, hardFloor);
  return {
    demandBase,
    requestedMultiplier: multiplier,
    requestedTarget,
    hardFloor,
    effectiveTarget,
    ceilingTarget,
    clamped: effectiveTarget > requestedTarget,
  };
}

export function trimPoolToTarget<T extends { id: string; salary: number }>(
  players: readonly T[],
  protectedIds: ReadonlySet<string>,
  fitOf: (player: T) => number,
  target: number,
): { kept: T[]; evicted: T[] } {
  const kept = new Map(players.map((player) => [player.id, player]));
  const evictable = [...players]
    .filter((player) => !protectedIds.has(player.id))
    .map((player) => ({ player, fit: fitOf(player) }))
    .sort((a, b) => {
      const fitDelta = a.fit - b.fit;
      if (Math.abs(fitDelta) > 1e-9) return fitDelta;
      if (a.player.salary !== b.player.salary) return b.player.salary - a.player.salary;
      return a.player.id.localeCompare(b.player.id);
    });
  const evicted: T[] = [];
  for (const { player } of evictable) {
    if (kept.size <= target) break;
    kept.delete(player.id);
    evicted.push(player);
  }
  return {
    kept: [...kept.values()].sort((a, b) => a.id.localeCompare(b.id)),
    evicted,
  };
}

function numericGradeOf(player: DemandUniversePlayer): number {
  return scoreSmb4Player({
    name: playerName(player),
    age: player.profile.age,
    primaryPosition: player.profile.primaryPosition ?? player.position,
    secondaryPosition: player.profile.secondaryPosition ?? player.secondaryPosition ?? undefined,
    bats: player.profile.bats,
    throws: player.profile.throws,
    power: player.profile.power,
    contact: player.profile.contact,
    speed: player.profile.speed,
    fielding: player.profile.fielding,
    arm: player.profile.arm,
    velocity: player.profile.velocity,
    junk: player.profile.junk,
    accuracy: player.profile.accuracy,
    arsenal: player.profile.arsenal ? [...player.profile.arsenal] : undefined,
    trait1: player.profile.traits?.[0] ?? undefined,
    trait2: player.profile.traits?.[1] ?? undefined,
  }).numericScore;
}

function numericWindowId(
  numericGrade: number,
  windows: readonly NumericPoolShapeWindow[] = poolBalancePresetTuning().windows,
): string | null {
  return windows.find((window) =>
    numericGrade >= window.minInclusive && numericGrade < window.maxExclusive
  )?.id ?? null;
}

function numericWindowIdOf(
  player: DemandUniversePlayer,
  windows: readonly NumericPoolShapeWindow[] = poolBalancePresetTuning().windows,
): string {
  return numericWindowId(numericGradeOf(player), windows) ?? 'unknown';
}

function numericBandOf(player: DemandUniversePlayer, tuning: NumericPoolShapeTuning): string {
  const grade = numericGradeOf(player);
  if (grade < tuning.lowTailMax) return 'low';
  if (grade >= tuning.superstarTailMin) return 'superstar';
  if (grade >= tuning.highTailMin) return 'high';
  if (grade >= tuning.middleMin && grade < tuning.middleMax) return 'middle';
  return 'other';
}

function roleBucketOf(player: DemandUniversePlayer): string {
  if (player.isPitcher) return `arm:${player.role ?? player.position ?? 'P'}`;
  return `pos:${player.position}`;
}

function roleWindowKey(
  player: DemandUniversePlayer,
  windows: readonly NumericPoolShapeWindow[] = poolBalancePresetTuning().windows,
): string {
  return `${roleBucketOf(player)}|${numericWindowIdOf(player, windows)}`;
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function largestRemainderCounts(
  entries: readonly { id: string; share: number }[],
  target: number,
): Record<string, number> {
  const raw = entries.map((entry) => ({
    id: entry.id,
    base: entry.share * target,
  }));
  const counts = Object.fromEntries(raw.map((entry) => [entry.id, Math.floor(entry.base)]));
  let assigned = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const remainders = raw
    .map((entry) => ({ id: entry.id, remainder: entry.base - Math.floor(entry.base) }))
    .sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));
  for (const entry of remainders) {
    if (assigned >= target) break;
    counts[entry.id] += 1;
    assigned += 1;
  }
  return counts;
}

function targetCountsByRoleBucket(
  source: readonly DemandUniversePlayer[],
  targetSize: number,
): Record<string, number> {
  const buckets = new Map<string, number>();
  for (const player of source) buckets.set(roleBucketOf(player), (buckets.get(roleBucketOf(player)) ?? 0) + 1);
  return largestRemainderCounts(
    [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({ id, share: source.length === 0 ? 0 : count / source.length })),
    targetSize,
  );
}

function targetCountsByWindow(
  targetSize: number,
  windows: readonly NumericPoolShapeWindow[] = poolBalancePresetTuning().windows,
): Record<string, number> {
  return largestRemainderCounts(windows.map((window) => ({ id: window.id, share: window.targetShare })), targetSize);
}

function targetCountsByBand(targetSize: number, tuning: NumericPoolShapeTuning): Record<string, number> {
  const entries = [
    { id: 'low', share: tuning.windows
      .filter((window) => window.maxExclusive <= tuning.lowTailMax)
      .reduce((sum, window) => sum + window.targetShare, 0) },
    { id: 'middle', share: tuning.windows
      .filter((window) => window.minInclusive >= tuning.middleMin && window.maxExclusive <= tuning.middleMax)
      .reduce((sum, window) => sum + window.targetShare, 0) },
    { id: 'high', share: tuning.windows
      .filter((window) => window.minInclusive >= tuning.highTailMin && window.minInclusive < tuning.superstarTailMin)
      .reduce((sum, window) => sum + window.targetShare, 0) },
    { id: 'superstar', share: tuning.windows
      .filter((window) => window.minInclusive >= tuning.superstarTailMin)
      .reduce((sum, window) => sum + window.targetShare, 0) },
  ];
  return largestRemainderCounts(entries, targetSize);
}

function positionSupplySlack(teamCount: number): number {
  const teams = Math.max(0, Math.floor(teamCount));
  if (teams === 0) return 0;
  return Math.max(
    POSITION_SUPPLY_FLOOR_TUNING.minimumSlack,
    Math.ceil(teams / POSITION_SUPPLY_FLOOR_TUNING.teamsPerSlack),
  );
}

function fieldPositionLabel(position: string): string {
  if (position === 'C') return 'CATCHERS';
  if (position === '1B') return 'FIRST BASEMEN';
  if (position === '2B') return 'SECOND BASEMEN';
  if (position === '3B') return 'THIRD BASEMEN';
  if (position === 'SS') return 'SHORTSTOPS';
  if (position === 'LF') return 'LEFT FIELDERS';
  if (position === 'CF') return 'CENTER FIELDERS';
  if (position === 'RF') return 'RIGHT FIELDERS';
  return position;
}

function buildPositionSupplyFloorTarget(
  teams: number,
  slack: number,
  input: Pick<PositionSupplyFloorTarget, 'kind' | 'position' | 'label' | 'minimumPerTeam'>,
): PositionSupplyFloorTarget {
  return {
    ...input,
    teams,
    slack,
    needed: teams > 0 && input.minimumPerTeam > 0
      ? teams * input.minimumPerTeam + slack
      : 0,
  };
}

export function derivePositionSupplyFloorTargets(teamCount: number): PositionSupplyFloorTarget[] {
  const teams = Math.max(0, Math.floor(teamCount));
  if (teams === 0) return [];
  const slack = positionSupplySlack(teams);
  const targets: PositionSupplyFloorTarget[] = [];

  for (const position of LEGAL_ROSTER.fieldPositions) {
    targets.push(buildPositionSupplyFloorTarget(teams, slack, {
      kind: 'field-position',
      position,
      label: fieldPositionLabel(position),
      minimumPerTeam: 1,
    }));
  }

  if (LEGAL_ROSTER.minCatchers > 1) {
    targets.push(buildPositionSupplyFloorTarget(teams, slack, {
      kind: 'catcher-depth',
      position: 'CATCHER_DEPTH',
      label: 'CATCHER DEPTH',
      minimumPerTeam: LEGAL_ROSTER.minCatchers,
    }));
  }

  if (LEGAL_ROSTER.startingPitchers > 0) {
    targets.push(buildPositionSupplyFloorTarget(teams, slack, {
      kind: 'starter',
      position: 'SP',
      label: 'STARTERS',
      minimumPerTeam: LEGAL_ROSTER.startingPitchers,
    }));
  }

  if (LEGAL_ROSTER.minClosers > 0) {
    targets.push(buildPositionSupplyFloorTarget(teams, slack, {
      kind: 'closer',
      position: 'CP',
      label: 'CLOSERS',
      minimumPerTeam: LEGAL_ROSTER.minClosers,
    }));
  }

  if (LEGAL_ROSTER.minRelievers > 0) {
    targets.push(buildPositionSupplyFloorTarget(teams, slack, {
      kind: 'reliever',
      position: 'RP',
      label: 'RELIEVERS',
      minimumPerTeam: LEGAL_ROSTER.minRelievers,
    }));
  }

  return targets.filter((target) => target.needed > 0);
}

/**
 * Necessary legal supply only. Competitive/hoarding slack belongs to pool
 * shaping, never to the start gate for a constructively seatable room.
 */
export function deriveHardPositionSupplyFloorTargets(teamCount: number): PositionSupplyFloorTarget[] {
  return derivePositionSupplyFloorTargets(teamCount).map((target) => ({
    ...target,
    slack: 0,
    needed: target.teams * target.minimumPerTeam,
  }));
}

export function matchesPositionSupplyFloor(
  player: RosterSlotPlayer,
  target: Pick<PositionSupplyFloorTarget, 'kind' | 'position'>,
): boolean {
  switch (target.kind) {
    case 'field-position':
      return !player.isPitcher && player.position === target.position;
    case 'catcher-depth':
      return canCover(player, 'C');
    case 'starter':
      return canStart(player);
    case 'reliever':
      return canRelieve(player);
    case 'closer':
      return isCloser(player);
  }
}

export function evaluatePositionSupplyFloors(
  players: readonly RosterSlotPlayer[],
  teamCount: number,
): PositionSupplyFloorResult[] {
  return deriveHardPositionSupplyFloorTargets(teamCount).map((target) => {
    const available = players.filter((player) => matchesPositionSupplyFloor(player, target)).length;
    return {
      ...target,
      available,
      missing: Math.max(0, target.needed - available),
    };
  });
}

/** Production-shape target, including competitive/hoarding depth. */
export function evaluateCompetitivePositionSupplyFloors(
  players: readonly RosterSlotPlayer[],
  teamCount: number,
): PositionSupplyFloorResult[] {
  return derivePositionSupplyFloorTargets(teamCount).map((target) => {
    const available = players.filter((player) => matchesPositionSupplyFloor(player, target)).length;
    return {
      ...target,
      available,
      missing: Math.max(0, target.needed - available),
    };
  });
}

export interface PositionSupplyFloorApplication {
  players: DemandUniversePlayer[];
  floors: PositionSupplyFloorResult[];
  injectedIds: string[];
  shortfalls: DemandShortfall[];
  messages: string[];
}

export function enforcePositionSupplyFloors(options: {
  universe: readonly DemandUniversePlayer[];
  players: readonly DemandUniversePlayer[];
  teams: number;
  fitOf?: (player: DemandUniversePlayer) => number;
  excludedIds?: ReadonlySet<string>;
  priorityIds?: ReadonlySet<string>;
  poolSourceMode?: PoolSourceMode;
}): PositionSupplyFloorApplication {
  const current = new Map(options.players.map((player) => [player.id, player]));
  const excludedIds = options.excludedIds ?? new Set<string>();
  const fitOf = options.fitOf ?? (() => 0);
  const priorityIds = options.poolSourceMode === 'team-roster-priority'
    ? options.priorityIds ?? new Set<string>()
    : new Set<string>();
  const comparator = bySourceThenFitDescIdAsc(fitOf, priorityIds);
  const injectedIds: string[] = [];
  const messages: string[] = [];

  for (const target of derivePositionSupplyFloorTargets(options.teams)) {
    const currentPlayers = [...current.values()];
    const floor = evaluateCompetitivePositionSupplyFloors(currentPlayers, options.teams)
      .find((candidate) => candidate.kind === target.kind && candidate.position === target.position);
    const missing = floor?.missing ?? 0;
    if (missing <= 0) continue;
    const candidates = options.universe
      .filter((player) => !current.has(player.id))
      .filter((player) => !excludedIds.has(player.id))
      .filter((player) => matchesPositionSupplyFloor(player, target))
      .sort(comparator);
    const picks = candidates.slice(0, missing);
    for (const pick of picks) {
      current.set(pick.id, pick);
      injectedIds.push(pick.id);
    }
    if (picks.length > 0) {
      messages.push(
        `position supply floor added ${picks.length} ${target.label.toLowerCase()} `
          + `(${floor?.available ?? 0}/${target.needed} before top-up).`,
      );
    }
  }

  const players = [...current.values()].sort((a, b) => a.id.localeCompare(b.id));
  const floors = evaluateCompetitivePositionSupplyFloors(players, options.teams);
  const shortfalls = floors.flatMap((floor) => {
    if (floor.missing <= 0) return [];
    const universeAvailable = options.universe
      .filter((player) => !excludedIds.has(player.id))
      .filter((player) => matchesPositionSupplyFloor(player, floor))
      .length;
    return [{
      key: `position-floor:${floor.position}`,
      position: floor.position,
      wanted: floor.needed,
      available: universeAvailable,
      message: `The uploaded universe has ${universeAvailable} ${floor.label.toLowerCase()}; `
        + `${floor.needed} required for ${floor.teams} club${floor.teams === 1 ? '' : 's'} plus hoarding slack.`,
    }];
  });

  return {
    players,
    floors,
    injectedIds,
    shortfalls,
    messages,
  };
}

function countPlayersByBand(
  players: readonly DemandUniversePlayer[],
  tuning: NumericPoolShapeTuning,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of players) incrementCount(counts, numericBandOf(player, tuning));
  return counts;
}

function countPlayersByWindow(
  players: readonly DemandUniversePlayer[],
  windows: readonly NumericPoolShapeWindow[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of players) incrementCount(counts, numericWindowIdOf(player, windows));
  return counts;
}

function qualityBandShortfallsByWindow(
  shortfalls: readonly NumericPoolQuotaShortfall[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const shortfall of shortfalls) {
    const missing = Math.max(0, shortfall.targetCount - shortfall.selectedCount);
    if (missing > 0) counts[shortfall.windowId] = (counts[shortfall.windowId] ?? 0) + missing;
  }
  return counts;
}

function qualityCenterShortfallReason(options: {
  poolQualityCenter: PoolQualityCenter;
  medianNumericGrade: number | null;
  quotaShortfalls: readonly NumericPoolQuotaShortfall[];
  hardKeepShapeOverflowByBand: Record<string, number>;
  curveViolations?: readonly NumericPoolCurveViolation[];
}): string | null {
  if (options.medianNumericGrade === null) return 'empty pool has no achieved median quality';
  if (Object.keys(options.hardKeepShapeOverflowByBand).length > 0) {
    return 'hard keeps or protected players exceed one or more shifted quality bands';
  }
  if (options.quotaShortfalls.length > 0) {
    return 'source pool constraints left one or more shifted role/quality buckets short';
  }
  if ((options.curveViolations ?? []).length > 0) {
    return 'G1 legality repair required curve tradeoffs after the shifted quality pass';
  }
  const delta = options.medianNumericGrade - options.poolQualityCenter;
  return Math.abs(delta) > 2
    ? 'achieved median quality is more than two points from the requested center'
    : null;
}

function stableHashToUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function seededCandidateWindowSize(windowId: string, needed: number, available: number): number {
  if (needed <= 0) return 0;
  if (available <= needed) return available;
  const extra = isMiddleWindow(windowId)
    ? Math.max(3, Math.ceil(needed * 0.50))
    : isHighTailWindow(windowId)
      ? Math.max(1, Math.ceil(needed * 0.20))
      : Math.max(2, Math.ceil(needed * 0.25));
  return Math.min(available, needed + extra);
}

function seededSelectionJitterWeight(windowId: string): number {
  if (isMiddleWindow(windowId)) return 1.10;
  if (isHighTailWindow(windowId)) return 0.25;
  if (isLowTailWindow(windowId)) return 0.35;
  return 0.55;
}

function selectWindowCandidates(options: {
  candidates: readonly DemandUniversePlayer[];
  needed: number;
  windowId: string;
  generationNonce?: number;
}): DemandUniversePlayer[] {
  if (options.needed <= 0) return [];
  const ordered = [...options.candidates];
  const nonce = Math.max(0, Math.floor(options.generationNonce ?? 0));
  if (nonce === 0 || ordered.length <= options.needed) {
    return ordered.slice(0, options.needed);
  }
  const windowSize = seededCandidateWindowSize(options.windowId, options.needed, ordered.length);
  const maxOffset = Math.max(0, Math.min(ordered.length - windowSize, windowSize - options.needed));
  const offset = maxOffset > 0 ? nonce % (maxOffset + 1) : 0;
  const candidateWindow = [
    ...ordered.slice(offset, offset + windowSize),
    ...ordered.slice(0, Math.max(0, offset + windowSize - ordered.length)),
  ];
  const jitterWeight = seededSelectionJitterWeight(options.windowId);
  return candidateWindow
    .map((player, index) => ({
      player,
      rank: index / Math.max(1, candidateWindow.length - 1),
      jitter: stableHashToUnit(`${nonce}|${options.windowId}|${player.id}`),
    }))
    .sort((a, b) =>
      (a.rank + a.jitter * jitterWeight) - (b.rank + b.jitter * jitterWeight)
      || a.player.id.localeCompare(b.player.id)
    )
    .slice(0, options.needed)
    .map((entry) => entry.player);
}

function byFitDescIdAsc(
  fitOf: (player: DemandUniversePlayer) => number,
): (a: DemandUniversePlayer, b: DemandUniversePlayer) => number {
  return (a, b) => {
    const fitDelta = fitOf(b) - fitOf(a);
    if (Math.abs(fitDelta) > 1e-9) return fitDelta;
    return a.id.localeCompare(b.id);
  };
}

function bySourceThenFitDescIdAsc(
  fitOf: (player: DemandUniversePlayer) => number,
  priorityIds: ReadonlySet<string>,
): (a: DemandUniversePlayer, b: DemandUniversePlayer) => number {
  return (a, b) => {
    const aPriority = priorityIds.has(a.id);
    const bPriority = priorityIds.has(b.id);
    if (aPriority !== bPriority) return aPriority ? -1 : 1;
    return byFitDescIdAsc(fitOf)(a, b);
  };
}

export function buildNumericPoolShapeDiagnostics(options: {
  players: readonly DemandUniversePlayer[];
  requiredRosterDemand: number;
  targetSize: number;
  preset?: PoolBalancePresetKey;
  poolQualityCenter?: number;
  tuning?: NumericPoolShapeTuning;
  hardKeepPlayers?: readonly DemandUniversePlayer[];
  engineGeneratedPlayers?: readonly DemandUniversePlayer[];
  designHardKeepIds?: ReadonlySet<string>;
  identityCriticalIds?: ReadonlySet<string>;
  missingIdentityCriticalReasons?: Record<string, string>;
  selectedTeamRosterIds?: ReadonlySet<string>;
  poolSourceMode?: PoolSourceMode;
  fullPoolEligibleCandidateCount?: number;
  excludedReaddedForLegalityCount?: number;
  legalCompletionFeasible?: boolean | null;
  quotaShortfalls?: readonly NumericPoolQuotaShortfall[];
  messages?: readonly string[];
  preRepair?: NumericPoolCurveSnapshot;
  postRepair?: NumericPoolCurveSnapshot;
  g1AdditionsByRoleWindow?: Record<string, number>;
  g1RemovalsByRoleWindow?: Record<string, number>;
  g1LowTailAdditionsByRole?: Record<string, number>;
  g1Swaps?: readonly NumericPoolRepairSwap[];
  curveViolations?: readonly NumericPoolCurveViolation[];
  g1AdditionCount?: number;
  g1SwapCount?: number;
}): NumericPoolShapeDiagnostics {
  const preset = options.preset ?? 'balanced';
  const poolQualityCenter = resolvePoolQualityCenter(options.poolQualityCenter);
  const qualityShift = poolQualityCenter - DEFAULT_POOL_QUALITY_CENTER;
  const tuning = options.tuning ?? poolBalancePresetTuning(preset, options.poolQualityCenter);
  const numericGrades = options.players.map(numericGradeOf);
  const denominator = numericGrades.length || 1;
  const highTailShare = numericGrades.filter((grade) => grade >= tuning.highTailMin).length / denominator;
  const superstarTailShare = numericGrades.filter((grade) => grade >= tuning.superstarTailMin).length / denominator;
  const middleMassShare = numericGrades.filter((grade) =>
    grade >= tuning.middleMin && grade < tuning.middleMax
  ).length / denominator;
  const lowTailShare = numericGrades.filter((grade) => grade < tuning.lowTailMax).length / denominator;
  const hardKeepPlayers = [...(options.hardKeepPlayers ?? [])];
  const finalIds = new Set(options.players.map((player) => player.id));
  const designHardKeepIds = options.designHardKeepIds ?? new Set<string>();
  const identityCriticalIds = options.identityCriticalIds ?? new Set<string>();
  const missingIdentityCriticalReasons = Object.fromEntries(
    [...identityCriticalIds]
      .filter((id) => !finalIds.has(id))
      .sort((a, b) => a.localeCompare(b))
      .map((id) => [id, options.missingIdentityCriticalReasons?.[id] ?? 'not selected by the current source pool']),
  );
  const engineGeneratedPlayers = options.engineGeneratedPlayers
    ? [...options.engineGeneratedPlayers]
    : options.players.filter((player) => !hardKeepPlayers.some((kept) => kept.id === player.id));
  const selectedTeamRosterIds = options.selectedTeamRosterIds ?? new Set<string>();
  const hardKeepByBand = countPlayersByBand(hardKeepPlayers, tuning);
  const engineGeneratedByBand = countPlayersByBand(engineGeneratedPlayers, tuning);
  const finalPoolByBand = countPlayersByBand(options.players, tuning);
  const targetBandCounts = targetCountsByBand(options.targetSize, tuning);
  const hardKeepShapeOverflowByBand: Record<string, number> = {};
  for (const [band, count] of Object.entries(hardKeepByBand)) {
    const overflow = count - (targetBandCounts[band] ?? 0);
    if (overflow > 0) hardKeepShapeOverflowByBand[band] = overflow;
  }
  const hardKeepOverflowCount = Math.max(0, hardKeepPlayers.length - options.targetSize);
  const overTargetReason = options.players.length > options.targetSize
    ? hardKeepOverflowCount > 0
      ? 'hardKeep overflow'
      : hardKeepPlayers.length > 0
        ? 'protected/manual keeps plus legal repair or curve violation'
        : 'legal repair or curve violation'
    : null;
  const positionRoleCoverage: Record<string, number> = {};
  for (const player of options.players) {
    const bucket = roleBucketOf(player);
    positionRoleCoverage[bucket] = (positionRoleCoverage[bucket] ?? 0) + 1;
  }
  const quotaShortfalls = [...(options.quotaShortfalls ?? [])];
  const medianNumericGrade = percentile(numericGrades, 0.5);
  const curveViolations = [...(options.curveViolations ?? [])];
  const diagnostics = {
    preset,
    poolQualityCenter,
    defaultQualityCenter: DEFAULT_POOL_QUALITY_CENTER,
    qualityShift,
    shiftedBandWindows: tuning.windows.map((window) => ({ ...window })),
    poolSize: options.players.length,
    requiredRosterDemand: options.requiredRosterDemand,
    poolSlackFactor: options.requiredRosterDemand > 0 ? options.players.length / options.requiredRosterDemand : 0,
    targetSize: options.targetSize,
    medianNumericGrade,
    targetMedianQuality: poolQualityCenter,
    achievedMedianQuality: medianNumericGrade,
    achievedMedianDelta: medianNumericGrade === null ? null : medianNumericGrade - poolQualityCenter,
    p90NumericGrade: percentile(numericGrades, 0.9),
    highTailShare,
    superstarTailShare,
    middleMassShare,
    lowTailShare,
    barbellIndex: highTailShare + lowTailShare - middleMassShare,
    positionRoleCoverage,
    quotaShortfalls,
    legalCompletionFeasible: options.legalCompletionFeasible ?? null,
    messages: [...(options.messages ?? [])],
    hardKeepCount: hardKeepPlayers.length,
    hardKeepOverflowCount,
    designHardKeepCount: [...designHardKeepIds].filter((id) => finalIds.has(id)).length,
    identityCriticalCandidateCount: identityCriticalIds.size,
    identityCriticalIncludedCount: [...identityCriticalIds].filter((id) => finalIds.has(id)).length,
    identityCriticalMissingCount: Object.keys(missingIdentityCriticalReasons).length,
    missingIdentityCriticalReasons,
    overTargetReason,
    hardKeepByBand,
    engineGeneratedByBand,
    finalPoolByBand,
    hardKeepShapeOverflowByBand,
    qualityBandTargetCounts: targetCountsByWindow(options.targetSize, tuning.windows),
    qualityBandFinalCounts: countPlayersByWindow(options.players, tuning.windows),
    qualityBandShortfalls: qualityBandShortfallsByWindow(quotaShortfalls),
    qualityCenterShortfallReason: qualityCenterShortfallReason({
      poolQualityCenter,
      medianNumericGrade,
      quotaShortfalls,
      hardKeepShapeOverflowByBand,
      curveViolations,
    }),
    excludedReaddedForLegalityCount: options.excludedReaddedForLegalityCount ?? 0,
    poolSourceMode: options.poolSourceMode ?? 'full-pool',
    selectedTeamRosterCandidateCount: selectedTeamRosterIds.size,
    selectedTeamRosterFinalCount: options.players.filter((player) => selectedTeamRosterIds.has(player.id)).length,
    fullPoolEligibleCandidateCount: options.fullPoolEligibleCandidateCount ?? options.players.length,
    engineGeneratedFromSelectedTeamRosterCount: engineGeneratedPlayers.filter((player) => selectedTeamRosterIds.has(player.id)).length,
    engineGeneratedFromFullPoolCount: engineGeneratedPlayers.filter((player) => !selectedTeamRosterIds.has(player.id)).length,
    hardKeepFromSelectedTeamRosterCount: hardKeepPlayers.filter((player) => selectedTeamRosterIds.has(player.id)).length,
  };
  return {
    ...diagnostics,
    ...(options.preRepair ? { preRepair: options.preRepair } : {}),
    ...(options.postRepair ? { postRepair: options.postRepair } : {}),
    ...(options.g1AdditionsByRoleWindow ? { g1AdditionsByRoleWindow: options.g1AdditionsByRoleWindow } : {}),
    ...(options.g1RemovalsByRoleWindow ? { g1RemovalsByRoleWindow: options.g1RemovalsByRoleWindow } : {}),
    ...(options.g1LowTailAdditionsByRole ? { g1LowTailAdditionsByRole: options.g1LowTailAdditionsByRole } : {}),
    ...(options.g1Swaps ? { g1Swaps: [...options.g1Swaps] } : {}),
    ...(options.curveViolations ? { curveViolations } : {}),
    ...(options.g1AdditionCount !== undefined ? { g1AdditionCount: options.g1AdditionCount } : {}),
    ...(options.g1SwapCount !== undefined ? { g1SwapCount: options.g1SwapCount } : {}),
  };
}

function curveSnapshot(
  players: readonly DemandUniversePlayer[],
  requiredRosterDemand: number,
  targetSize: number,
  preset: PoolBalancePresetKey = 'balanced',
  tuning: NumericPoolShapeTuning = poolBalancePresetTuning(preset),
  poolQualityCenter: number = DEFAULT_POOL_QUALITY_CENTER,
): NumericPoolCurveSnapshot {
  const diagnostics = buildNumericPoolShapeDiagnostics({
    players,
    requiredRosterDemand,
    targetSize,
    preset,
    tuning,
    poolQualityCenter,
  });
  return {
    poolSize: diagnostics.poolSize,
    requiredRosterDemand: diagnostics.requiredRosterDemand,
    poolSlackFactor: diagnostics.poolSlackFactor,
    targetSize: diagnostics.targetSize,
    medianNumericGrade: diagnostics.medianNumericGrade,
    highTailShare: diagnostics.highTailShare,
    middleMassShare: diagnostics.middleMassShare,
    lowTailShare: diagnostics.lowTailShare,
    barbellIndex: diagnostics.barbellIndex,
  };
}

export function numericGradeForPoolShape(player: DemandUniversePlayer): number {
  return numericGradeOf(player);
}

export function shapePoolByNumericGrade(options: {
  universe: readonly DemandUniversePlayer[];
  currentPlayers: readonly DemandUniversePlayer[];
  protectedIds: ReadonlySet<string>;
  excludedIds?: ReadonlySet<string>;
  targetSize: number;
  requiredRosterDemand: number;
  fitOf: (player: DemandUniversePlayer) => number;
  preset?: PoolBalancePresetKey;
  poolQualityCenter?: number;
  tuning?: NumericPoolShapeTuning;
  generationNonce?: number;
  poolSourceMode?: PoolSourceMode;
  priorityIds?: ReadonlySet<string>;
}): { players: DemandUniversePlayer[]; diagnostics: NumericPoolShapeDiagnostics } {
  const preset = options.preset ?? 'balanced';
  const poolQualityCenter = resolvePoolQualityCenter(options.poolQualityCenter);
  const tuning = options.tuning ?? poolBalancePresetTuning(preset, options.poolQualityCenter);
  const excludedIds = options.excludedIds ?? new Set<string>();
  const poolSourceMode = options.poolSourceMode ?? 'full-pool';
  const selectedTeamRosterIds = options.priorityIds ?? new Set<string>();
  const priorityIds = poolSourceMode === 'team-roster-priority'
    ? selectedTeamRosterIds
    : new Set<string>();
  const fitComparator = bySourceThenFitDescIdAsc(options.fitOf, priorityIds);
  const protectedPlayers = [...options.currentPlayers]
    .filter((player) => options.protectedIds.has(player.id) && !excludedIds.has(player.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const selected = new Map(protectedPlayers.map((player) => [player.id, player]));
  const effectiveTarget = Math.max(0, Math.floor(options.targetSize));
  const windows = tuning.windows;
  const roleTargets = targetCountsByRoleBucket(options.universe.filter((player) => !excludedIds.has(player.id)), effectiveTarget);
  const quotaShortfalls: NumericPoolQuotaShortfall[] = [];
  const messages: string[] = [];

  for (const [bucket, bucketTarget] of Object.entries(roleTargets).sort(([a], [b]) => a.localeCompare(b))) {
    const bucketSource = options.universe.filter((player) => roleBucketOf(player) === bucket && !excludedIds.has(player.id));
    const windowTargets = targetCountsByWindow(bucketTarget, windows);
    for (const window of windows) {
      const targetCount = windowTargets[window.id] ?? 0;
      if (targetCount <= 0) continue;
      const protectedCount = protectedPlayers.filter((player) =>
        roleBucketOf(player) === bucket && numericWindowId(numericGradeOf(player), windows) === window.id
      ).length;
      const needed = Math.max(0, targetCount - protectedCount);
      const candidates = bucketSource
        .filter((player) => !selected.has(player.id))
        .filter((player) => numericWindowId(numericGradeOf(player), windows) === window.id)
        .sort(fitComparator);
      const picks = selectWindowCandidates({
        candidates,
        needed,
        windowId: window.id,
        generationNonce: options.generationNonce,
      });
      for (const pick of picks) selected.set(pick.id, pick);
      if (picks.length < needed) {
        quotaShortfalls.push({
          roleBucket: bucket,
          windowId: window.id,
          minInclusive: window.minInclusive,
          maxExclusive: window.maxExclusive,
          targetCount,
          protectedCount,
          selectedCount: protectedCount + picks.length,
          availableCount: protectedCount + candidates.length,
        });
      }
    }
  }

  if (selected.size < effectiveTarget) {
    const remaining = options.universe
      .filter((player) => !selected.has(player.id) && !excludedIds.has(player.id))
      .sort((a, b) => {
        const aMiddle = numericGradeOf(a) >= tuning.middleMin && numericGradeOf(a) < tuning.middleMax;
        const bMiddle = numericGradeOf(b) >= tuning.middleMin && numericGradeOf(b) < tuning.middleMax;
        if (aMiddle !== bMiddle) return aMiddle ? -1 : 1;
        return fitComparator(a, b);
      });
    const needed = effectiveTarget - selected.size;
    const picks = options.generationNonce && options.generationNonce > 0
      ? selectWindowCandidates({
          candidates: remaining,
          needed,
          windowId: 'fallback',
          generationNonce: options.generationNonce,
        })
      : remaining.slice(0, needed);
    for (const pick of picks) selected.set(pick.id, pick);
    messages.push(
      `numeric grade quota fallback added ${Math.min(needed, remaining.length)} deterministic source candidates after explicit quota shortfalls.`,
    );
  }

  const highTailCapCount = Math.floor(effectiveTarget * tuning.highTailCap);
  let highTailCount = [...selected.values()].filter((player) => numericGradeOf(player) >= tuning.highTailMin).length;
  if (highTailCount > highTailCapCount) {
    let swaps = 0;
    const highTailEvictable = () => [...selected.values()]
      .filter((player) => !options.protectedIds.has(player.id))
      .filter((player) => numericGradeOf(player) >= tuning.highTailMin)
      .sort((a, b) => {
        const fitDelta = options.fitOf(a) - options.fitOf(b);
        if (Math.abs(fitDelta) > 1e-9) return fitDelta;
        return a.id.localeCompare(b.id);
      });
    for (const highTailPlayer of highTailEvictable()) {
      if (highTailCount <= highTailCapCount) break;
      const sameBucket = roleBucketOf(highTailPlayer);
      const replacementCandidates = options.universe
        .filter((player) => !selected.has(player.id) && !excludedIds.has(player.id))
        .filter((player) => numericGradeOf(player) < tuning.highTailMin)
        .sort((a, b) => {
          const aSameBucket = roleBucketOf(a) === sameBucket;
          const bSameBucket = roleBucketOf(b) === sameBucket;
          if (aSameBucket !== bSameBucket) return aSameBucket ? -1 : 1;
          const aMiddle = numericGradeOf(a) >= tuning.middleMin;
          const bMiddle = numericGradeOf(b) >= tuning.middleMin;
          if (aMiddle !== bMiddle) return aMiddle ? -1 : 1;
          return byFitDescIdAsc(options.fitOf)(a, b);
        });
      const replacement = replacementCandidates[0];
      if (!replacement) continue;
      selected.delete(highTailPlayer.id);
      selected.set(replacement.id, replacement);
      highTailCount -= 1;
      swaps += 1;
    }
    if (swaps > 0) {
      messages.push(`numeric grade high-tail cap swapped ${swaps} excess high-end player${swaps === 1 ? '' : 's'} into non-high supply before G1 legality recheck.`);
    }
    if (highTailCount > highTailCapCount) {
      messages.push(
        `numeric grade high-tail cap still exceeds target by ${highTailCount - highTailCapCount}; protected players or missing same-role middle supply prevented further swaps.`,
      );
    }
  }

  const superstarCapCount = Math.floor(effectiveTarget * tuning.superstarTailCap);
  let superstarCount = [...selected.values()].filter((player) => numericGradeOf(player) >= tuning.superstarTailMin).length;
  if (superstarCount > superstarCapCount) {
    let swaps = 0;
    const superstarEvictable = () => [...selected.values()]
      .filter((player) => !options.protectedIds.has(player.id))
      .filter((player) => numericGradeOf(player) >= tuning.superstarTailMin)
      .sort((a, b) => {
        const fitDelta = options.fitOf(a) - options.fitOf(b);
        if (Math.abs(fitDelta) > 1e-9) return fitDelta;
        return a.id.localeCompare(b.id);
      });
    for (const superstar of superstarEvictable()) {
      if (superstarCount <= superstarCapCount) break;
      const sameBucket = roleBucketOf(superstar);
      const replacement = options.universe
        .filter((player) => !selected.has(player.id) && !excludedIds.has(player.id))
        .filter((player) => numericGradeOf(player) < tuning.superstarTailMin)
        .sort((a, b) => {
          const aSameBucket = roleBucketOf(a) === sameBucket;
          const bSameBucket = roleBucketOf(b) === sameBucket;
          if (aSameBucket !== bSameBucket) return aSameBucket ? -1 : 1;
          const aMiddle = numericGradeOf(a) >= tuning.middleMin && numericGradeOf(a) < tuning.middleMax;
          const bMiddle = numericGradeOf(b) >= tuning.middleMin && numericGradeOf(b) < tuning.middleMax;
          if (aMiddle !== bMiddle) return aMiddle ? -1 : 1;
          return byFitDescIdAsc(options.fitOf)(a, b);
        })[0];
      if (!replacement) continue;
      selected.delete(superstar.id);
      selected.set(replacement.id, replacement);
      superstarCount -= 1;
      swaps += 1;
    }
    if (swaps > 0) {
      messages.push(`numeric grade superstar cap swapped ${swaps} excess superstar-tail player${swaps === 1 ? '' : 's'} into lower supply before G1 legality recheck.`);
    }
    if (superstarCount > superstarCapCount) {
      messages.push(
        `numeric grade superstar cap still exceeds target by ${superstarCount - superstarCapCount}; protected players or missing same-role supply prevented further swaps.`,
      );
    }
  }

  if (protectedPlayers.length > effectiveTarget) {
    messages.push(
      `protected classes already exceed the numeric target by ${protectedPlayers.length - effectiveTarget}; protected asks, claims, floors, and pins were preserved.`,
    );
  }

  const players = [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
  return {
    players,
    diagnostics: buildNumericPoolShapeDiagnostics({
      players,
      requiredRosterDemand: options.requiredRosterDemand,
      targetSize: effectiveTarget,
      preset,
      tuning,
      poolQualityCenter,
      quotaShortfalls,
      messages,
      hardKeepPlayers: protectedPlayers,
      engineGeneratedPlayers: players.filter((player) => !options.protectedIds.has(player.id)),
      selectedTeamRosterIds,
      poolSourceMode,
      fullPoolEligibleCandidateCount: options.universe.filter((player) => !excludedIds.has(player.id)).length,
    }),
  };
}

export function selectFitAwareRepairCandidate<T extends { id: string; salary: number }>(
  eligible: readonly T[],
  currentMinFit: number,
  fitOf: (player: T) => number,
): { player: T | null; lastResort: boolean } {
  const byPrice = [...eligible].sort((a, b) => a.salary - b.salary || a.id.localeCompare(b.id));
  const qualified = byPrice.filter((player) => fitOf(player) + 1e-9 >= currentMinFit);
  return {
    player: qualified[0] ?? byPrice[0] ?? null,
    lastResort: qualified.length === 0 && byPrice.length > 0,
  };
}

function cellKeyOf(slot: DesignSlot): string | null {
  const preference = slot.preference;
  if (!preference?.shape) return null; // no-ask slots ride the floors, not a cell
  const tagKey = preference.tags ? JSON.stringify(preference.tags) : '';
  return `${slot.position ?? slot.kind}|${preference.shape}|${tagKey}`;
}

function toDesignPoolPlayer(player: DemandUniversePlayer): DesignPoolPlayer {
  return {
    id: player.id,
    salary: player.salary,
    profile: player.profile,
    slotPlayer: player,
  };
}

function playerName(player: DemandUniversePlayer): string {
  const maybe = player as DemandUniversePlayer & { name?: string; firstName?: string; lastName?: string };
  return maybe.name ?? ([maybe.firstName, maybe.lastName].filter(Boolean).join(' ') || player.id);
}

function makeMaxFitOf(
  selectedArchetypes: readonly HistoricalArchetype[],
  tier: TierKey,
  posture: RosterPosture,
): (player: DemandUniversePlayer) => number {
  if (selectedArchetypes.length === 0) return () => 0;
  const scorers = selectedArchetypes.map((archetype) =>
    archetypeFitScorer(historicalToSimArchetype(archetype), tier, posture),
  );
  return (player) => Math.max(...scorers.map((score) => score(player)));
}

function trimClampMessage(sizing: Pick<PoolSizingResult, 'demandBase' | 'requestedMultiplier' | 'requestedTarget'>, finalSize: number, cap: number): string {
  const effective = sizing.demandBase > 0 ? finalSize / sizing.demandBase : 0;
  return `You asked for a ${sizing.requestedMultiplier}× pool (${sizing.requestedTarget}); fielding every club's roster under your $${Math.round(cap).toLocaleString()} needs ${finalSize} (${effective.toFixed(2)}×). Sized up to ${finalSize}.`;
}

function eligibleForRepairGroup(slot: DesignSlot, player: DemandUniversePlayer): boolean {
  switch (slot.kind) {
    case 'pos':
      return !player.isPitcher && player.position === slot.position;
    case 'backupC':
      return canCover(player, 'C');
    case 'sp':
      return canStart(player);
    case 'rp':
      return canRelieve(player);
    case 'cp':
      return isCloser(player);
    case 'flex':
      return !player.isPitcher;
    case 'swing':
      return !player.isPitcher || canRelieve(player);
  }
}

function repairSlotsForFailure(failing: PoolG1Result['failing'] | undefined): Array<DesignSlot | null> {
  const slots = buildDefaultDesignSlots();
  if (!failing) return [];
  if (failing.overrun !== undefined) return [null];
  const byId = new Map(slots.map((slot) => [slot.slotId, slot]));
  const chosen: DesignSlot[] = [];
  for (const blocker of failing.blockers) {
    const slotId = blocker.slice(0, blocker.indexOf(':'));
    const exact = byId.get(slotId);
    if (exact && !chosen.some((slot) => slot.slotId === exact.slotId)) chosen.push(exact);
  }
  if (chosen.length === 0) {
    chosen.push(...slots);
  }
  return chosen;
}

function repairClassSlots(slot: DesignSlot | null, player: DemandUniversePlayer): DesignSlot[] {
  if (slot) return [slot];
  const matching = buildDefaultDesignSlots().filter((candidateSlot) => eligibleForRepairGroup(candidateSlot, player));
  return matching.length > 0 ? matching : buildDefaultDesignSlots();
}

function expectedRoleBucketsForSlot(slot: DesignSlot | null): string[] {
  if (!slot) return [];
  switch (slot.kind) {
    case 'pos':
      return slot.position ? [`pos:${slot.position}`] : [];
    case 'backupC':
      return ['pos:C'];
    case 'sp':
      return ['arm:SP', 'arm:SP/RP'];
    case 'rp':
      return ['arm:RP', 'arm:SP/RP'];
    case 'cp':
      return ['arm:CP'];
    case 'flex':
      return ['pos:1B', 'pos:2B', 'pos:3B', 'pos:SS', 'pos:LF', 'pos:CF', 'pos:RF', 'pos:C'];
    case 'swing':
      return ['arm:RP', 'arm:SP/RP', 'pos:1B', 'pos:2B', 'pos:3B', 'pos:SS', 'pos:LF', 'pos:CF', 'pos:RF', 'pos:C'];
  }
}

function isMiddleCoreWindow(windowId: string): boolean {
  return windowId === 'middle-core';
}

function isAdjacentMiddleWindow(windowId: string): boolean {
  return windowId === 'middle-low' || windowId === 'middle-high';
}

function isMiddleWindow(windowId: string): boolean {
  return isMiddleCoreWindow(windowId) || isAdjacentMiddleWindow(windowId);
}

function isLowTailWindow(windowId: string): boolean {
  return windowId === 'low-tail';
}

function isHighTailWindow(windowId: string): boolean {
  return windowId === 'high-tail' || windowId === 'ultra-high-tail';
}

function countWindow(
  players: readonly DemandUniversePlayer[],
  windowId: string,
  windows: readonly NumericPoolShapeWindow[] = poolBalancePresetTuning().windows,
): number {
  return players.filter((player) => numericWindowIdOf(player, windows) === windowId).length;
}

function maxLowTailCount(size: number, tuning: NumericPoolShapeTuning = poolBalancePresetTuning()): number {
  return Math.ceil(size * tuning.lowTailRepairCap);
}

function maxHighTailCount(size: number, tuning: NumericPoolShapeTuning = poolBalancePresetTuning()): number {
  return Math.floor(size * tuning.highTailCap);
}

function incrementCount(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function repairCandidatePriority(options: {
  player: DemandUniversePlayer;
  slot: DesignSlot | null;
  currentPlayers: readonly DemandUniversePlayer[];
  fitOf: (player: DemandUniversePlayer) => number;
  tuning?: NumericPoolShapeTuning;
}): number {
  const tuning = options.tuning ?? poolBalancePresetTuning();
  const windows = tuning.windows;
  const windowId = numericWindowIdOf(options.player, windows);
  const expectedBuckets = expectedRoleBucketsForSlot(options.slot);
  const sameRole = expectedBuckets.length === 0 || expectedBuckets.includes(roleBucketOf(options.player));
  const highTailSafe = !isHighTailWindow(windowId)
    || countWindow(options.currentPlayers, 'high-tail', windows) + 1 <= maxHighTailCount(options.currentPlayers.length + 1, tuning);
  if (sameRole && isMiddleCoreWindow(windowId)) return 0;
  if (sameRole && isAdjacentMiddleWindow(windowId)) return 1;
  if (sameRole && isHighTailWindow(windowId) && highTailSafe) return 2;
  if (!sameRole && isMiddleCoreWindow(windowId)) return 3;
  if (!sameRole && isAdjacentMiddleWindow(windowId)) return 4;
  if (!sameRole && isHighTailWindow(windowId) && highTailSafe) return 5;
  if (sameRole && isLowTailWindow(windowId)) return 6;
  if (!sameRole && isLowTailWindow(windowId)) return 7;
  if (isHighTailWindow(windowId)) return 8;
  return 9;
}

function sortRepairCandidates(
  candidates: readonly DemandUniversePlayer[],
  slot: DesignSlot | null,
  currentPlayers: readonly DemandUniversePlayer[],
  fitOf: (player: DemandUniversePlayer) => number,
  tuning: NumericPoolShapeTuning = poolBalancePresetTuning(),
): DemandUniversePlayer[] {
  return [...candidates].sort((a, b) => {
    const priorityDelta = repairCandidatePriority({ player: a, slot, currentPlayers, fitOf, tuning })
      - repairCandidatePriority({ player: b, slot, currentPlayers, fitOf, tuning });
    if (priorityDelta !== 0) return priorityDelta;
    const fitDelta = fitOf(b) - fitOf(a);
    if (Math.abs(fitDelta) > 1e-9) return fitDelta;
    if (a.salary !== b.salary) return a.salary - b.salary;
    return a.id.localeCompare(b.id);
  });
}

function selectCurveSwapEvictionCandidate(options: {
  currentPlayers: readonly DemandUniversePlayer[];
  protectedIds: ReadonlySet<string>;
  incoming: DemandUniversePlayer;
  slot: DesignSlot | null;
  fitOf: (player: DemandUniversePlayer) => number;
  tuning?: NumericPoolShapeTuning;
}): DemandUniversePlayer | null {
  const incomingBucket = roleBucketOf(options.incoming);
  const windows = (options.tuning ?? poolBalancePresetTuning()).windows;
  const incomingWindow = numericWindowIdOf(options.incoming, windows);
  return options.currentPlayers
    .filter((player) => !options.protectedIds.has(player.id))
    .filter((player) => isLowTailWindow(numericWindowIdOf(player, windows)))
    .sort((a, b) => {
      const aWindow = numericWindowIdOf(a, windows);
      const bWindow = numericWindowIdOf(b, windows);
      const aSameBucket = roleBucketOf(a) === incomingBucket;
      const bSameBucket = roleBucketOf(b) === incomingBucket;
      const aLow = isLowTailWindow(aWindow);
      const bLow = isLowTailWindow(bWindow);
      if (aLow !== bLow) return aLow ? -1 : 1;
      if (aSameBucket !== bSameBucket) return aSameBucket ? -1 : 1;
      const aWorseThanIncoming = isLowTailWindow(aWindow) && !isLowTailWindow(incomingWindow);
      const bWorseThanIncoming = isLowTailWindow(bWindow) && !isLowTailWindow(incomingWindow);
      if (aWorseThanIncoming !== bWorseThanIncoming) return aWorseThanIncoming ? -1 : 1;
      const fitDelta = options.fitOf(a) - options.fitOf(b);
      if (Math.abs(fitDelta) > 1e-9) return fitDelta;
      if (a.salary !== b.salary) return b.salary - a.salary;
      return a.id.localeCompare(b.id);
    })[0] ?? null;
}

function eligibleForRepairClass(slot: DesignSlot | null, player: DemandUniversePlayer): boolean {
  return (slot ? [slot] : buildDefaultDesignSlots()).some((candidateSlot) => eligibleForRepairGroup(candidateSlot, player));
}

function selectSwapDownEvictionCandidate(
  currentPlayers: readonly DemandUniversePlayer[],
  protectedIds: ReadonlySet<string>,
  slot: DesignSlot | null,
  incoming: DemandUniversePlayer,
): DemandUniversePlayer | null {
  const classSlots = repairClassSlots(slot, incoming);
  return currentPlayers
    .filter((player) => !protectedIds.has(player.id))
    .filter((player) => player.salary > incoming.salary)
    .filter((player) => classSlots.some((candidateSlot) => eligibleForRepairGroup(candidateSlot, player)))
    .sort((a, b) => b.salary - a.salary || a.id.localeCompare(b.id))[0] ?? null;
}

function excludedWouldQualifyMessage(
  universe: readonly DemandUniversePlayer[],
  current: ReadonlyMap<string, DemandUniversePlayer>,
  excludedIds: ReadonlySet<string>,
  repairSlots: readonly (DesignSlot | null)[],
  slotBound: number,
  currentMinFit: number,
  fitOf: (player: DemandUniversePlayer) => number,
): string | null {
  const slots = repairSlots.length > 0 ? repairSlots : [null];
  const candidate = universe
    .filter((player) => !current.has(player.id))
    .filter((player) => excludedIds.has(player.id))
    .filter((player) =>
      slots.some((slot) =>
        slot
          ? eligibleForRepairGroup(slot, player)
          : buildDefaultDesignSlots().some((candidateSlot) => eligibleForRepairGroup(candidateSlot, player)),
      ),
    )
    .filter((player) => player.salary <= slotBound)
    .filter((player) => fitOf(player) + 1e-9 >= currentMinFit)
    .sort((a, b) => a.salary - b.salary || a.id.localeCompare(b.id))[0];
  return candidate
    ? `${playerName(candidate)}, whom you removed by hand, would qualify — re-add them to close this gap.`
    : null;
}

function runG1Check(
  players: readonly DemandUniversePlayer[],
  teams: number,
  budget: number,
): PoolG1Result {
  const result = seatAllClubs(players.map(toDesignPoolPlayer), teams, budget);
  return {
    holds: result.holds,
    assemblies: result.assemblies,
    ...(result.failing ? { failing: result.failing } : {}),
    repairRounds: 0,
  };
}

export function repairG1PoolForSizing(options: {
  universe: readonly DemandUniversePlayer[];
  players: readonly DemandUniversePlayer[];
  protectedIds: ReadonlySet<string>;
  requestedExcludedIds?: ReadonlySet<string>;
  teams: number;
  budget: number;
  maxRounds: number;
  poolMinSalary: number;
  fitOf: (player: DemandUniversePlayer) => number;
  handReconcileEnabled?: boolean;
  requiredRosterDemand?: number;
  targetSize?: number;
  maxRepairSlackFactor?: number;
  repairGrowthAllowed?: boolean;
  failOnCurveViolation?: boolean;
  preset?: PoolBalancePresetKey;
  poolQualityCenter?: number;
  tuning?: NumericPoolShapeTuning;
}): PoolG1RepairResult {
  const preset = options.preset ?? 'balanced';
  const poolQualityCenter = resolvePoolQualityCenter(options.poolQualityCenter);
  const tuning = options.tuning ?? poolBalancePresetTuning(preset, options.poolQualityCenter);
  const requestedExcludedIds = options.requestedExcludedIds ?? new Set<string>();
  const requiredRosterDemand = Math.max(0, options.requiredRosterDemand ?? options.teams * LEGAL_ROSTER.size);
  const targetSize = Math.max(0, Math.floor(options.targetSize ?? options.players.length));
  const maxRepairSlackFactor = options.maxRepairSlackFactor ?? tuning.maxRepairSlackFactor;
  const repairGrowthAllowed = options.repairGrowthAllowed ?? true;
  const maxRepairSize = requiredRosterDemand > 0
    ? Math.max(targetSize, Math.floor(requiredRosterDemand * maxRepairSlackFactor))
    : Number.POSITIVE_INFINITY;
  const current = new Map(options.players.map((player) => [player.id, player]));
  let g1 = runG1Check([...current.values()].sort((a, b) => a.id.localeCompare(b.id)), options.teams, options.budget);
  const messages: string[] = [];
  const injectedIds: string[] = [];
  const evictedIds: string[] = [];
  const additionsByRoleWindow: Record<string, number> = {};
  const removalsByRoleWindow: Record<string, number> = {};
  const lowTailAdditionsByRole: Record<string, number> = {};
  const swaps: NumericPoolRepairSwap[] = [];
  const curveViolations: NumericPoolCurveViolation[] = [];
  let excludedRepairNoteAdded = false;
  let rounds = 0;
  while (!g1.holds && rounds < options.maxRounds) {
    rounds += 1;
    const repairSlots = repairSlotsForFailure(g1.failing);
    const isOverrunRepair = g1.failing?.overrun !== undefined;
    let addedThisRound = 0;
    const currentPlayers = [...current.values()];
    const currentMinFit = currentPlayers.length > 0
      ? Math.min(...currentPlayers.map(options.fitOf))
      : Number.NEGATIVE_INFINITY;
    const slotBound = options.budget - 21 * options.poolMinSalary;
    for (const slot of repairSlots) {
      const label = slot ? (slot.position ?? slot.slotId) : 'roster';
      const eligible = options.universe
        .filter((player) => !current.has(player.id))
        .filter((player) => !requestedExcludedIds.has(player.id))
        .filter((player) => eligibleForRepairClass(slot, player))
        .filter((player) => player.salary <= slotBound)
        .sort((a, b) => a.id.localeCompare(b.id));
      if (eligible.length === 0) continue;
      const fitQualified = eligible.filter((player) => options.fitOf(player) + 1e-9 >= currentMinFit);
      const repairCandidates = sortRepairCandidates(
        fitQualified.length > 0 ? fitQualified : eligible,
        slot,
        currentPlayers,
        options.fitOf,
        tuning,
      );
      const chosen = repairCandidates[0] ?? null;
      if (!chosen) continue;
      const lastResort = fitQualified.length === 0;
      const chosenWindow = numericWindowIdOf(chosen, tuning.windows);
      const chosenRole = roleBucketOf(chosen);
      if (isOverrunRepair) {
        const evicted = selectSwapDownEvictionCandidate([...current.values()], options.protectedIds, slot, chosen);
        if (!evicted) continue;
        current.set(chosen.id, chosen);
        current.delete(evicted.id);
        injectedIds.push(chosen.id);
        evictedIds.push(evicted.id);
        incrementCount(additionsByRoleWindow, roleWindowKey(chosen, tuning.windows));
        incrementCount(removalsByRoleWindow, roleWindowKey(evicted, tuning.windows));
        if (isLowTailWindow(chosenWindow)) incrementCount(lowTailAdditionsByRole, chosenRole);
        swaps.push({
          addedId: chosen.id,
          removedId: evicted.id,
          roleBucket: chosenRole,
          windowId: chosenWindow,
          removedRoleBucket: roleBucketOf(evicted),
          removedWindowId: numericWindowIdOf(evicted, tuning.windows),
        });
        if (lastResort) {
          messages.push(
            `no affordable ${label} body also fits your league's identities — swapped in the cheapest legal option `
              + `(${playerName(chosen)}; id ${chosen.id}) and evicted ${playerName(evicted)} (id ${evicted.id}).`,
          );
        } else {
          messages.push(
            `swap-down repair for ${label}: injected ${playerName(chosen)} (id ${chosen.id}) and evicted `
              + `${playerName(evicted)} (id ${evicted.id}).`,
          );
        }
      } else {
        const sizeWouldExceedTarget = current.size + 1 > targetSize;
        const sizeWouldExceedMaxRepair = current.size + 1 > maxRepairSize;
        const lowTailWouldExceedCap = isLowTailWindow(chosenWindow)
          && countWindow([...current.values()], 'low-tail', tuning.windows) + 1 > maxLowTailCount(current.size + 1, tuning);
        const shouldTrySwap = sizeWouldExceedTarget || lowTailWouldExceedCap || !repairGrowthAllowed;
        let evicted: DemandUniversePlayer | null = null;
        if (shouldTrySwap) {
          evicted = selectCurveSwapEvictionCandidate({
            currentPlayers: [...current.values()],
            protectedIds: options.protectedIds,
            incoming: chosen,
            slot,
            fitOf: options.fitOf,
            tuning,
          });
        }
        if (!evicted && (sizeWouldExceedMaxRepair || !repairGrowthAllowed)) {
          curveViolations.push({
            code: 'REPAIR_GROWTH_LIMIT',
            message: `G1 repair needs ${label}, but adding ${playerName(chosen)} would exceed max repair slack ${maxRepairSlackFactor.toFixed(2)}x.`,
          });
          continue;
        }
        if (!evicted && lowTailWouldExceedCap) {
          curveViolations.push({
            code: 'LOW_TAIL_CAP_EXCEEDED',
            message: `G1 repair needs ${label}, but ${playerName(chosen)} would push low-tail share above ${(tuning.lowTailRepairCap * 100).toFixed(0)}%.`,
          });
        }
        if (lastResort) {
          messages.push(
            `no affordable ${label} body also fits your league's identities — added the cheapest legal option (${playerName(chosen)}).`,
          );
        }
        current.set(chosen.id, chosen);
        injectedIds.push(chosen.id);
        incrementCount(additionsByRoleWindow, roleWindowKey(chosen, tuning.windows));
        if (isLowTailWindow(chosenWindow)) incrementCount(lowTailAdditionsByRole, chosenRole);
        if (evicted) {
          current.delete(evicted.id);
          evictedIds.push(evicted.id);
          incrementCount(removalsByRoleWindow, roleWindowKey(evicted, tuning.windows));
          swaps.push({
            addedId: chosen.id,
            removedId: evicted.id,
            roleBucket: chosenRole,
            windowId: chosenWindow,
            removedRoleBucket: roleBucketOf(evicted),
            removedWindowId: numericWindowIdOf(evicted, tuning.windows),
          });
          messages.push(
            `curve-preserving G1 repair for ${label}: swapped in ${playerName(chosen)} (id ${chosen.id}) `
              + `and removed low-priority ${playerName(evicted)} (id ${evicted.id}).`,
          );
        }
      }
      addedThisRound += 1;
    }
    if (addedThisRound === 0) {
      const suffix = options.handReconcileEnabled && !excludedRepairNoteAdded
        ? excludedWouldQualifyMessage(options.universe, current, requestedExcludedIds, repairSlots, slotBound, currentMinFit, options.fitOf)
        : null;
      if (suffix) excludedRepairNoteAdded = true;
      messages.push(
        `pool still cannot field every club after repair: ${g1.failing?.blockers.join(' ') ?? 'no further legal body is available'}${suffix ? ` ${suffix}` : ''}`,
      );
      g1 = { ...g1, repairRounds: rounds };
      break;
    }
    g1 = runG1Check([...current.values()].sort((a, b) => a.id.localeCompare(b.id)), options.teams, options.budget);
    g1 = { ...g1, repairRounds: rounds };
  }
  if (!g1.holds && rounds >= options.maxRounds) {
    messages.push(
      `pool still cannot field every club after ${rounds} repair rounds: ${g1.failing?.blockers.join(' ') ?? 'repair exhausted'}`,
    );
  }
  const finalPlayers = [...current.values()].sort((a, b) => a.id.localeCompare(b.id));
  const finalSnapshot = curveSnapshot(finalPlayers, requiredRosterDemand, targetSize, preset, tuning, poolQualityCenter);
  if (!g1.holds && curveViolations.length > 0) {
    curveViolations.push({
      code: 'LEGALITY_REQUIRES_CURVE_VIOLATION',
      message: 'G1 could not legalize within the configured curve and repair-growth guardrails.',
    });
  }
  if (finalSnapshot.middleMassShare + 1e-9 < tuning.targetMiddleMass) {
    curveViolations.push({
      code: 'MIDDLE_MASS_TARGET_MISSED',
      message: `post-repair middle mass ${(finalSnapshot.middleMassShare * 100).toFixed(1)}% is below ${(tuning.targetMiddleMass * 100).toFixed(0)}%.`,
    });
  }
  if (finalSnapshot.lowTailShare > tuning.lowTailRepairCap + 1e-9) {
    curveViolations.push({
      code: 'LOW_TAIL_CAP_EXCEEDED',
      message: `post-repair low tail ${(finalSnapshot.lowTailShare * 100).toFixed(1)}% exceeds ${(tuning.lowTailRepairCap * 100).toFixed(0)}%.`,
    });
  }
  if (finalSnapshot.poolSlackFactor > maxRepairSlackFactor + 1e-9) {
    curveViolations.push({
      code: 'REPAIR_GROWTH_LIMIT',
      message: `post-repair slack ${finalSnapshot.poolSlackFactor.toFixed(2)}x exceeds max repair slack ${maxRepairSlackFactor.toFixed(2)}x.`,
    });
  }
  if ((options.failOnCurveViolation ?? false) && curveViolations.length > 0) {
    g1 = {
      ...g1,
      holds: false,
      failing: {
        pass: g1.failing?.pass ?? rounds,
        blockers: curveViolations.map((violation) => `${violation.code}: ${violation.message}`),
      },
    };
  }
  return {
    players: finalPlayers,
    g1,
    injectedIds,
    evictedIds,
    messages,
    additionsByRoleWindow,
    removalsByRoleWindow,
    lowTailAdditionsByRole,
    swaps,
    curveViolations,
  };
}

function demandCellMatches(
  classification: Pick<ShapeClassification, 'shape' | 'runnerUp'>,
  preference: SlotPreference,
): boolean {
  if (!preference.shape) return true;
  if (classification.shape === preference.shape) return true;
  return (preference.allowRunnerUp ?? true) && classification.runnerUp === preference.shape;
}

/**
 * Counts the same shape-only match set the extractor uses for a demand cell. Tags and positions
 * label the ask; they do not tighten reservation eligibility.
 */
export function countCellMatches(
  classifiedPlayers: readonly ClassifiedDemandPlayer[],
  preference: SlotPreference,
): number {
  return classifiedPlayers.filter(({ classification }) => demandCellMatches(classification, preference)).length;
}

/** Evenly-spaced price-spread pick: the ask must be affordable at more than one tier. */
function priceSpread(sorted: DemandUniversePlayer[], count: number): DemandUniversePlayer[] {
  if (sorted.length <= count) return [...sorted];
  const picks: DemandUniversePlayer[] = [];
  for (let index = 0; index < count; index += 1) {
    picks.push(sorted[Math.floor((index * (sorted.length - 1)) / Math.max(1, count - 1))]);
  }
  return [...new Set(picks)];
}

export function extractPoolFromDemand(
  universe: DemandUniversePlayer[],
  designs: readonly TeamDesignInput[],
  selectedArchetypes: readonly HistoricalArchetype[],
  tier: TierKey,
  options: {
    teams?: number;
    shills?: number;
    budgetPerTeam?: number;
    contestMultiplier?: number;
    poolBalancePreset?: PoolBalancePresetKey;
    poolQualityCenter?: number;
    poolSizeMultiplier?: number;
    sizeTarget?: number;
    maxRepairRounds?: number;
    posture?: RosterPosture;
    pinnedIds?: string[];
    excludedIds?: string[];
    maxRepairSlackFactor?: number;
    repairGrowthAllowed?: boolean;
    failOnCurveViolation?: boolean;
    generationNonce?: number;
    poolSourceMode?: PoolSourceMode;
    priorityIds?: string[];
    designPriorityIds?: string[];
  } = {},
): PoolFromDemandResult {
  const contest = options.contestMultiplier ?? POOL_FROM_DEMAND_TUNING.contestMultiplier;
  const posture = options.posture ?? 'optimal';
  const poolBalancePreset = options.poolBalancePreset ?? 'balanced';
  const poolQualityCenter = resolvePoolQualityCenter(options.poolQualityCenter);
  const poolShapeTuning = poolBalancePresetTuning(poolBalancePreset, options.poolQualityCenter);
  if (options.teams === undefined) {
    throw new PoolTeamsForSizingMissingError();
  }
  const teamsForSizing = Math.max(0, Math.floor(options.teams));
  const sizingEnabled = options.sizeTarget !== undefined
    || options.poolSizeMultiplier !== undefined
    || options.poolBalancePreset !== undefined
    || options.poolQualityCenter !== undefined;
  const handReconcileEnabled = Boolean(options.pinnedIds?.length || options.excludedIds?.length);
  const requestedPinnedIds = new Set(options.pinnedIds ?? []);
  const requestedExcludedIds = new Set(options.excludedIds ?? []);
  const requestedPriorityIds = new Set(options.priorityIds ?? []);
  const requestedDesignPriorityIds = new Set(options.designPriorityIds ?? []);
  const designReconcileEnabled = requestedDesignPriorityIds.size > 0;
  const reconcileEnabled = handReconcileEnabled || designReconcileEnabled;
  const poolMinSalary = universe.length > 0 ? Math.min(...universe.map((player) => player.salary)) : 0;
  const universeIds = new Set(universe.map((player) => player.id));

  // 1. Type the universe once (whole-profile classification).
  const classified: ClassifiedDemandPlayer[] = universe.map((player) => ({
    player,
    classification: classifyPlayerArchetype(player.profile),
  }));

  // 2. Aggregate the demand cells across all human designs.
  const cellMap = new Map<string, { slot: DesignSlot; slotIds: string[]; asks: number }>();
  for (const design of designs) {
    for (const slot of design.slots) {
      const key = cellKeyOf(slot);
      if (!key) continue;
      const cell = cellMap.get(key) ?? { slot, slotIds: [], asks: 0 };
      cell.asks += 1;
      cell.slotIds.push(`${design.teamId}:${slot.slotId}`);
      cellMap.set(key, cell);
    }
  }

  // 3. Reserve per cell with contest multiplicity + price spread. Matching mirrors the
  //    feasibility evaluator's semantics (asked shape via top-1 or allowed runner-up).
  const reservedIds = new Set<string>();
  const cells: DemandCellReport[] = [];
  const shortfalls: DemandShortfall[] = [];
  for (const [key, cell] of [...cellMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const preference = cell.slot.preference!;
    const allowRunnerUp = preference.allowRunnerUp ?? true;
    const matching = classified
      .filter(({ player }) => cell.slot.kind === 'cp' ? isCloser(player) : true)
      .filter(({ classification }) => demandCellMatches(classification, { ...preference, allowRunnerUp }))
      .map(({ player }) => player)
      .sort((a, b) => a.salary - b.salary || a.id.localeCompare(b.id));
    const wanted = Math.ceil(cell.asks * contest);
    const picks = priceSpread(matching, wanted);
    for (const pick of picks) reservedIds.add(pick.id);
    cells.push({ key, preference, slotIds: cell.slotIds, asks: cell.asks, wanted, reserved: picks.length });
    const singleSlotBound = Number.isFinite(options.budgetPerTeam ?? Number.POSITIVE_INFINITY)
      ? (options.budgetPerTeam ?? Number.POSITIVE_INFINITY) - 21 * poolMinSalary
      : Number.POSITIVE_INFINITY;
    if (matching.length > 0 && matching.every((player) => player.salary > singleSlotBound)) {
      shortfalls.push({
        key,
        wanted,
        available: matching.length,
        message: `Your league wants ${wanted} ${preference.shape}${cell.slot.position ? ` at ${cell.slot.position}` : ''}`
          + `, but every candidate costs more than a $${Math.round(options.budgetPerTeam ?? 0).toLocaleString()} cap can carry.`,
      });
    } else if (picks.length < wanted) {
      shortfalls.push({
        key,
        wanted,
        available: matching.length,
        message: `Your league wants ${wanted} ${preference.shape}${cell.slot.position ? ` at ${cell.slot.position}` : ''}`
          + ` (${cell.asks} club${cell.asks === 1 ? '' : 's'} asking × contest); the uploaded universe holds ${matching.length}.`,
      });
    }
  }

  // 4. The archetype-feasibility floors + balance, from the SAME universe (C1B, audited).
  const floors = extractDraftPool(universe, selectedArchetypes, tier, {
    teams: options.teams,
    budgetPerTeam: options.budgetPerTeam,
  });

  // 5. Build the candidate seed. In legacy no-sizing mode this stays the historical
  // reservations + C1B floors union. In sizing mode the numeric shaper owns source selection
  // from the full universe; the C1B extraction remains a verdict/fit input instead of first
  // assembling the barbell pool we are trying to avoid.
  const byId = new Map<string, DemandUniversePlayer>();
  for (const { player } of classified) {
    if (reservedIds.has(player.id)) byId.set(player.id, player);
  }
  const explicitProtectedIdsForExclusions = new Set<string>([
    ...reservedIds,
    ...(handReconcileEnabled ? requestedPinnedIds : []),
  ]);
  const effectiveExcludedIds = new Set(
    [...requestedExcludedIds].filter((id) => !explicitProtectedIdsForExclusions.has(id)),
  );
  if (!sizingEnabled) {
    for (const player of floors.players as DemandUniversePlayer[]) {
      if (!byId.has(player.id)) byId.set(player.id, player);
    }
  }
  if (reconcileEnabled) {
    for (const id of effectiveExcludedIds) byId.delete(id);
    const classifiedById = new Map(classified.map(({ player }) => [player.id, player]));
    for (const id of [...new Set([...requestedDesignPriorityIds, ...requestedPinnedIds])].sort((a, b) => a.localeCompare(b))) {
      if (requestedExcludedIds.has(id) && !requestedPinnedIds.has(id)) continue;
      const player = classifiedById.get(id);
      if (player) byId.set(id, player);
    }
  }
  let players = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  let sizing: PoolSizingResult | undefined;
  let g1: PoolG1Result | undefined;
  let numericShape: NumericPoolShapeDiagnostics | undefined;
  let positionSupplyFloors: PositionSupplyFloorResult[] = [];
  const fitOf = makeMaxFitOf(selectedArchetypes, tier, posture);

  if (sizingEnabled) {
    const target = resolvePoolSizingTarget({
      teams: teamsForSizing,
      shills: options.shills ?? 0,
      poolSizeMultiplier: options.poolSizeMultiplier ?? poolShapeTuning.poolSlackFactor,
      sizeTarget: options.sizeTarget,
    });
    const protectedIds = new Set<string>([
      ...reservedIds,
      ...(handReconcileEnabled ? requestedPinnedIds : []),
      ...requestedDesignPriorityIds,
    ]);
    const designHardKeepIds = new Set<string>([
      ...(handReconcileEnabled ? requestedPinnedIds : []),
      ...requestedDesignPriorityIds,
    ]);
    const identityCriticalMissingReasons = () => {
      const selectedIds = new Set(players.map((player) => player.id));
      return Object.fromEntries(
        [...requestedDesignPriorityIds]
          .filter((id) => !selectedIds.has(id))
          .sort((a, b) => a.localeCompare(b))
          .map((id) => [
            id,
            requestedExcludedIds.has(id)
              ? 'manual exclusion'
              : !universeIds.has(id)
                ? 'not in eligible player universe'
                : 'not selected by the current source pool',
          ]),
      );
    };
    const beforeShape = players;
    const excludedForShape = handReconcileEnabled ? effectiveExcludedIds : new Set<string>();
    const shaped = shapePoolByNumericGrade({
      universe,
      currentPlayers: players,
      protectedIds,
      excludedIds: excludedForShape,
      targetSize: target.effectiveTarget,
      requiredRosterDemand: target.demandBase,
      fitOf,
      preset: poolBalancePreset,
      tuning: poolShapeTuning,
      poolQualityCenter,
      generationNonce: options.generationNonce,
      poolSourceMode: options.poolSourceMode ?? 'full-pool',
      priorityIds: requestedPriorityIds,
    });
    players = shaped.players;
    numericShape = shaped.diagnostics;
    const preRepairShape = curveSnapshot(players, target.demandBase, target.effectiveTarget, poolBalancePreset, poolShapeTuning, poolQualityCenter);
    const keptAfterShape = new Set(players.map((player) => player.id));
    const shapeEvictedIds = beforeShape
      .filter((player) => !protectedIds.has(player.id) && !keptAfterShape.has(player.id))
      .map((player) => player.id)
      .sort((a, b) => a.localeCompare(b));
    const messages: string[] = [];
    if (target.clamped) {
      messages.push(trimClampMessage(target, target.effectiveTarget, options.budgetPerTeam ?? Number.POSITIVE_INFINITY));
    }
    messages.push(...numericShape.messages);
    if (numericShape.quotaShortfalls.length > 0) {
      messages.push(
        `numeric grade quota shortfalls reported in ${numericShape.quotaShortfalls.length} role/window bucket${numericShape.quotaShortfalls.length === 1 ? '' : 's'}; fallback stayed deterministic and did not silently overfill stars or scrubs.`,
      );
    }
    if (players.length > target.effectiveTarget) {
      messages.push(
        `pool exceeds the ${target.effectiveTarget} target by ${players.length - target.effectiveTarget}: every remaining player is claimed by an ask, an identity build, a structural floor${handReconcileEnabled && players.some((player) => requestedPinnedIds.has(player.id)) ? ', or your own hand-picks' : ''}`,
      );
    }

    let injectedIds: string[] = [];
    let repairEvictedIds: string[] = [];
    const budget = options.budgetPerTeam ?? Number.POSITIVE_INFINITY;
    if (Number.isFinite(budget) && teamsForSizing > 0) {
      const repair = repairG1PoolForSizing({
        universe,
        players,
        protectedIds,
        requestedExcludedIds: excludedForShape,
        teams: teamsForSizing,
        budget,
        maxRounds: options.maxRepairRounds ?? 6,
        poolMinSalary,
        fitOf,
        handReconcileEnabled,
        requiredRosterDemand: target.demandBase,
        targetSize: target.effectiveTarget,
        maxRepairSlackFactor: options.maxRepairSlackFactor,
        repairGrowthAllowed: options.repairGrowthAllowed,
        failOnCurveViolation: options.failOnCurveViolation,
        preset: poolBalancePreset,
        poolQualityCenter,
        tuning: poolShapeTuning,
      });
      players = repair.players;
      g1 = repair.g1;
      injectedIds = repair.injectedIds;
      repairEvictedIds = repair.evictedIds;
      messages.push(...repair.messages);
      if (repair.curveViolations.length > 0) {
        messages.push(
          `G1 repair reported ${repair.curveViolations.length} curve violation${repair.curveViolations.length === 1 ? '' : 's'}; legal completion was not allowed to silently stuff cheap tail bodies.`,
        );
      }
      numericShape = buildNumericPoolShapeDiagnostics({
        players,
        requiredRosterDemand: target.demandBase,
        targetSize: target.effectiveTarget,
        preset: poolBalancePreset,
        tuning: poolShapeTuning,
        poolQualityCenter,
        legalCompletionFeasible: g1?.holds ?? null,
        quotaShortfalls: numericShape.quotaShortfalls,
        messages: numericShape.messages,
        hardKeepPlayers: players.filter((player) => protectedIds.has(player.id)),
        engineGeneratedPlayers: players.filter((player) => !protectedIds.has(player.id)),
        designHardKeepIds,
        identityCriticalIds: requestedDesignPriorityIds,
        missingIdentityCriticalReasons: identityCriticalMissingReasons(),
        selectedTeamRosterIds: requestedPriorityIds,
        poolSourceMode: options.poolSourceMode ?? 'full-pool',
        fullPoolEligibleCandidateCount: universe.filter((player) => !effectiveExcludedIds.has(player.id)).length,
        preRepair: preRepairShape,
        postRepair: curveSnapshot(players, target.demandBase, target.effectiveTarget, poolBalancePreset, poolShapeTuning, poolQualityCenter),
        g1AdditionsByRoleWindow: repair.additionsByRoleWindow,
        g1RemovalsByRoleWindow: repair.removalsByRoleWindow,
        g1LowTailAdditionsByRole: repair.lowTailAdditionsByRole,
        g1Swaps: repair.swaps,
        curveViolations: repair.curveViolations,
        g1AdditionCount: injectedIds.length,
        g1SwapCount: repair.swaps.length,
      });
    } else {
      numericShape = buildNumericPoolShapeDiagnostics({
        players,
        requiredRosterDemand: target.demandBase,
        targetSize: target.effectiveTarget,
        preset: poolBalancePreset,
        tuning: poolShapeTuning,
        poolQualityCenter,
        legalCompletionFeasible: g1?.holds ?? null,
        quotaShortfalls: numericShape.quotaShortfalls,
        messages: numericShape.messages,
        hardKeepPlayers: players.filter((player) => protectedIds.has(player.id)),
        engineGeneratedPlayers: players.filter((player) => !protectedIds.has(player.id)),
        designHardKeepIds,
        identityCriticalIds: requestedDesignPriorityIds,
        missingIdentityCriticalReasons: identityCriticalMissingReasons(),
        selectedTeamRosterIds: requestedPriorityIds,
        poolSourceMode: options.poolSourceMode ?? 'full-pool',
        fullPoolEligibleCandidateCount: universe.filter((player) => !effectiveExcludedIds.has(player.id)).length,
        preRepair: preRepairShape,
        postRepair: preRepairShape,
        g1AdditionsByRoleWindow: {},
        g1RemovalsByRoleWindow: {},
        g1LowTailAdditionsByRole: {},
        g1Swaps: [],
        curveViolations: [],
        g1AdditionCount: 0,
        g1SwapCount: 0,
      });
    }

    const floorTopUp = enforcePositionSupplyFloors({
      universe,
      players,
      teams: teamsForSizing,
      fitOf,
      excludedIds: excludedForShape,
      priorityIds: requestedPriorityIds,
      poolSourceMode: options.poolSourceMode ?? 'full-pool',
    });
    players = floorTopUp.players;
    positionSupplyFloors = floorTopUp.floors;
    injectedIds = [...injectedIds, ...floorTopUp.injectedIds];
    shortfalls.push(...floorTopUp.shortfalls);
    messages.push(...floorTopUp.messages);
    if (numericShape) {
      numericShape = buildNumericPoolShapeDiagnostics({
        players,
        requiredRosterDemand: target.demandBase,
        targetSize: target.effectiveTarget,
        preset: poolBalancePreset,
        tuning: poolShapeTuning,
        poolQualityCenter,
        legalCompletionFeasible: g1?.holds ?? null,
        quotaShortfalls: numericShape.quotaShortfalls,
        messages: [...numericShape.messages, ...floorTopUp.messages],
        hardKeepPlayers: players.filter((player) => protectedIds.has(player.id)),
        engineGeneratedPlayers: players.filter((player) => !protectedIds.has(player.id)),
        designHardKeepIds,
        identityCriticalIds: requestedDesignPriorityIds,
        missingIdentityCriticalReasons: identityCriticalMissingReasons(),
        selectedTeamRosterIds: requestedPriorityIds,
        poolSourceMode: options.poolSourceMode ?? 'full-pool',
        fullPoolEligibleCandidateCount: universe.filter((player) => !effectiveExcludedIds.has(player.id)).length,
        preRepair: numericShape.preRepair,
        postRepair: curveSnapshot(players, target.demandBase, target.effectiveTarget, poolBalancePreset, poolShapeTuning, poolQualityCenter),
        g1AdditionsByRoleWindow: numericShape.g1AdditionsByRoleWindow ?? {},
        g1RemovalsByRoleWindow: numericShape.g1RemovalsByRoleWindow ?? {},
        g1LowTailAdditionsByRole: numericShape.g1LowTailAdditionsByRole ?? {},
        g1Swaps: numericShape.g1Swaps ?? [],
        curveViolations: numericShape.curveViolations ?? [],
        g1AdditionCount: numericShape.g1AdditionCount ?? 0,
        g1SwapCount: numericShape.g1SwapCount ?? 0,
      });
    }

    const finalSize = players.length;
    if (finalSize > target.ceilingTarget && !messages.some((message) => message.includes('Sized up to'))) {
      messages.push(trimClampMessage(target, finalSize, options.budgetPerTeam ?? Number.POSITIVE_INFINITY));
    }
    sizing = {
      ...target,
      finalSize,
      trimmedCount: shapeEvictedIds.length,
      evictedIds: [...shapeEvictedIds, ...repairEvictedIds],
      injectedIds,
      clamped: target.clamped || finalSize > target.requestedTarget,
      messages,
      ...(handReconcileEnabled
        ? {
            pinnedHandPicks: players
              .filter((player) => requestedPinnedIds.has(player.id))
              .map((player) => player.id)
              .sort((a, b) => a.localeCompare(b)),
            excludedHandRemoves: universe
              .filter((player) => requestedExcludedIds.has(player.id) && !players.some((kept) => kept.id === player.id))
              .map((player) => player.id)
              .sort((a, b) => a.localeCompare(b)),
          }
        : {}),
    };
  }

  if (!sizingEnabled) {
    const floorTopUp = enforcePositionSupplyFloors({
      universe,
      players,
      teams: teamsForSizing,
      fitOf,
      excludedIds: handReconcileEnabled ? effectiveExcludedIds : new Set<string>(),
      priorityIds: requestedPriorityIds,
      poolSourceMode: options.poolSourceMode ?? 'full-pool',
    });
    players = floorTopUp.players;
    positionSupplyFloors = floorTopUp.floors;
    shortfalls.push(...floorTopUp.shortfalls);
  }

  // 6. Re-verify every human design against the FINAL pool (the hub-drift check).
  const designPool = players.map(toDesignPoolPlayer);
  const budget = options.budgetPerTeam ?? Number.POSITIVE_INFINITY;
  const designVerdicts = designs.map((design) => ({
    teamId: design.teamId,
    result: evaluateRosterDesign(design.slots, designPool, budget),
  }));

  return {
    players,
    size: players.length,
    floors,
    cells,
    shortfalls,
    designVerdicts,
    positionSupplyFloors,
    ...(sizing ? { sizing } : {}),
    ...(g1 ? { g1 } : {}),
    ...(numericShape ? { numericShape } : {}),
  };
}
