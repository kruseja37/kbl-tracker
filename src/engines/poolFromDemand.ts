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
import {
  archetypeFitScorer,
  buildIdentityRoster,
  type RosterPosture,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import { historicalToSimArchetype, rankArchetypeDraftability } from './draftabilityRanker';
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
  /** One-capacity person key. Alternate cards of the same person share this value. */
  versionGroupId?: string;
  profile: ClassifiableProfile;
}

function demandVersionGroupId(player: Pick<DemandUniversePlayer, 'id' | 'versionGroupId'>): string {
  return player.versionGroupId?.trim() || player.id;
}

function demandVersionGroupIds(players: readonly DemandUniversePlayer[]): Set<string> {
  return new Set(players.map(demandVersionGroupId));
}

function removeDemandGroupIfAbsent(
  players: ReadonlyMap<string, DemandUniversePlayer>,
  groups: Set<string>,
  removed: DemandUniversePlayer,
): void {
  const groupId = demandVersionGroupId(removed);
  if (![...players.values()].some((player) => demandVersionGroupId(player) === groupId)) {
    groups.delete(groupId);
  }
}

function uniqueDemandCardsByVersionGroup(
  players: readonly DemandUniversePlayer[],
  blockedGroups: ReadonlySet<string> = new Set<string>(),
): DemandUniversePlayer[] {
  const seen = new Set(blockedGroups);
  return players.filter((player) => {
    const groupId = demandVersionGroupId(player);
    if (seen.has(groupId)) return false;
    seen.add(groupId);
    return true;
  });
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

export interface PoolIdentitySupportReceipt {
  readonly version: 1;
  readonly authorityFingerprint: string;
  readonly sourceFingerprint: string;
  readonly playerIds: readonly string[];
}

function canonicalPoolReceiptJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    return Object.keys(current as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        const entry = (current as Record<string, unknown>)[key];
        if (entry !== undefined) sorted[key] = entry;
        return sorted;
      }, {});
  });
}


function compactPoolReceiptFingerprint(value: unknown): string {
  const source = canonicalPoolReceiptJson(value);
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${source.length.toString(36)}:${left.toString(16).padStart(8, '0')}:${right.toString(16).padStart(8, '0')}`;
}

function poolIdentitySupportFingerprint(input: {
  universe: readonly DemandUniversePlayer[];
  selectedArchetypes: readonly HistoricalArchetype[];
  tier: TierKey;
  teams: number;
  budgetPerTeam?: number;
  playerIds: readonly string[];
  authorityFingerprint: string;
}): string {
  return `snake-pool-support-v1:${compactPoolReceiptFingerprint({
    authorityFingerprint: input.authorityFingerprint,
    budgetPerTeam: input.budgetPerTeam,
    playerIds: [...input.playerIds].sort((left, right) => left.localeCompare(right)),
    selectedArchetypes: input.selectedArchetypes,
    teams: input.teams,
    tier: input.tier,
    universe: [...input.universe].sort((left, right) => left.id.localeCompare(right.id)),
  })}`;
}

/** Bind the validated Snake support authority to the exact numeric-shaping input. */
export function createPoolIdentitySupportReceipt(input: {
  universe: readonly DemandUniversePlayer[];
  selectedArchetypes: readonly HistoricalArchetype[];
  tier: TierKey;
  teams: number;
  budgetPerTeam?: number;
  playerIds: readonly string[];
  authorityFingerprint: string;
}): PoolIdentitySupportReceipt {
  const playerIds = [...input.playerIds].sort((left, right) => left.localeCompare(right));
  return {
    version: 1,
    authorityFingerprint: input.authorityFingerprint,
    sourceFingerprint: poolIdentitySupportFingerprint({ ...input, playerIds }),
    playerIds,
  };
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
  code:
    | 'LEGALITY_REQUIRES_CURVE_VIOLATION'
    | 'REPAIR_GROWTH_LIMIT'
    | 'LOW_TAIL_CAP_EXCEEDED'
    | 'MIDDLE_MASS_TARGET_MISSED'
    | 'HIGH_TAIL_CAP_EXCEEDED'
    | 'SUPERSTAR_TAIL_CAP_EXCEEDED';
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
  teamCount: number,
): Record<string, number> {
  const buckets = new Map<string, number>();
  for (const player of source) buckets.set(roleBucketOf(player), (buckets.get(roleBucketOf(player)) ?? 0) + 1);
  const sourceRelative = largestRemainderCounts(
    [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({ id, share: source.length === 0 ? 0 : count / source.length })),
    targetSize,
  );

  // FINDING-254: an archive's historical role mix is not the roster's desired bullpen mix.
  // Preserve the source-relative total number of pitchers, but divide those pitcher seats by the
  // canonical nine-arm roster shape: four starters, one swing arm, three ordinary relievers, and
  // one closer. If the selected source cannot supply a role, consume every available person in that
  // role and redistribute only the unavoidable remainder. Full Sources bypasses shaping entirely.
  const pitcherDemand = [
    { id: 'arm:SP', weight: 4 },
    { id: 'arm:SP/RP', weight: 1 },
    { id: 'arm:RP', weight: 3 },
    { id: 'arm:CP', weight: 1 },
  ] as const;
  const pitcherTarget = pitcherDemand.reduce((sum, entry) => sum + (sourceRelative[entry.id] ?? 0), 0);
  const availableByRole = Object.fromEntries(pitcherDemand.map((entry) => [
    entry.id,
    buckets.get(entry.id) ?? 0,
  ]));
  const rebalanced = Object.fromEntries(pitcherDemand.map((entry) => [entry.id, 0])) as Record<string, number>;
  let remaining = Math.min(
    pitcherTarget,
    Object.values(availableByRole).reduce((sum, count) => sum + count, 0),
  );

  while (remaining > 0) {
    const open = pitcherDemand.filter((entry) => rebalanced[entry.id] < availableByRole[entry.id]);
    if (open.length === 0) break;
    const totalWeight = open.reduce((sum, entry) => sum + entry.weight, 0);
    const proposed = largestRemainderCounts(
      open.map((entry) => ({ id: entry.id, share: entry.weight / totalWeight })),
      remaining,
    );
    let added = 0;
    for (const entry of open) {
      const room = availableByRole[entry.id] - rebalanced[entry.id];
      const take = Math.min(room, proposed[entry.id] ?? 0);
      rebalanced[entry.id] += take;
      added += take;
    }
    if (added === 0) {
      const fallback = [...open].sort((left, right) => (
        right.weight - left.weight || left.id.localeCompare(right.id)
      ))[0];
      rebalanced[fallback.id] += 1;
      added = 1;
    }
    remaining -= added;
  }

  const closerFloor = derivePositionSupplyFloorTargets(teamCount)
    .find((target) => target.kind === 'closer')?.needed ?? 0;
  const closerId = 'arm:CP';
  const closerShortfall = Math.max(
    0,
    Math.min(closerFloor, availableByRole[closerId]) - rebalanced[closerId],
  );
  for (let index = 0; index < closerShortfall; index += 1) {
    const donor = pitcherDemand
      .filter((entry) => entry.id !== closerId && rebalanced[entry.id] > 0)
      .sort((left, right) => (
        (rebalanced[right.id] / right.weight) - (rebalanced[left.id] / left.weight)
        || left.id.localeCompare(right.id)
      ))[0];
    if (!donor) break;
    rebalanced[donor.id] -= 1;
    rebalanced[closerId] += 1;
  }


  const supplyFloors = derivePositionSupplyFloorTargets(teamCount);
  const starterFloor = supplyFloors.find((target) => target.kind === 'starter')?.needed ?? 0;
  const relieverFloor = supplyFloors.find((target) => target.kind === 'reliever')?.needed ?? 0;
  const transferToFunctionalGroup = (options: {
    needed: number;
    receiverIds: readonly string[];
    donorIds: readonly string[];
  }): void => {
    for (let index = 0; index < options.needed; index += 1) {
      const receiver = pitcherDemand
        .filter((entry) => options.receiverIds.includes(entry.id))
        .filter((entry) => rebalanced[entry.id] < availableByRole[entry.id])
        .sort((left, right) => (
          (rebalanced[left.id] / left.weight) - (rebalanced[right.id] / right.weight)
          || right.weight - left.weight
          || left.id.localeCompare(right.id)
        ))[0];
      const donor = pitcherDemand
        .filter((entry) => options.donorIds.includes(entry.id))
        .filter((entry) => rebalanced[entry.id] > 0)
        .filter((entry) => entry.id !== closerId || rebalanced[entry.id] > closerFloor)
        .sort((left, right) => (
          (rebalanced[right.id] / right.weight) - (rebalanced[left.id] / left.weight)
          || left.id.localeCompare(right.id)
        ))[0];
      if (!receiver || !donor) break;
      rebalanced[donor.id] -= 1;
      rebalanced[receiver.id] += 1;
    }
  };
  const starterCount = rebalanced['arm:SP'] + rebalanced['arm:SP/RP'];
  transferToFunctionalGroup({
    needed: Math.max(0, starterFloor - starterCount),
    receiverIds: ['arm:SP', 'arm:SP/RP'],
    donorIds: ['arm:RP', 'arm:CP'],
  });
  const relieverCount = rebalanced['arm:SP/RP'] + rebalanced['arm:RP'] + rebalanced['arm:CP'];
  transferToFunctionalGroup({
    needed: Math.max(0, relieverFloor - relieverCount),
    receiverIds: ['arm:SP/RP', 'arm:RP', 'arm:CP'],
    donorIds: ['arm:SP'],
  });

  return {
    ...sourceRelative,
    ...rebalanced,
  };
}

function shapeRepresentativeUniverse(
  source: readonly DemandUniversePlayer[],
  fitOf: (player: DemandUniversePlayer) => number,
  qualityCenter: number,
): DemandUniversePlayer[] {
  const byGroup = new Map<string, DemandUniversePlayer[]>();
  for (const player of source) {
    const groupId = demandVersionGroupId(player);
    byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), player]);
  }
  return [...byGroup.values()]
    .map((cards) => [...cards].sort((left, right) => {
      const centerDelta = Math.abs(numericGradeOf(left) - qualityCenter)
        - Math.abs(numericGradeOf(right) - qualityCenter);
      if (Math.abs(centerDelta) > 1e-9) return centerDelta;
      const fitDelta = fitOf(right) - fitOf(left);
      if (Math.abs(fitDelta) > 1e-9) return fitDelta;
      return left.id.localeCompare(right.id);
    })[0])
    .sort((left, right) => left.id.localeCompare(right.id));
}

function trimDemandPoolToPersonTarget(
  players: readonly DemandUniversePlayer[],
  protectedIds: ReadonlySet<string>,
  fitOf: (player: DemandUniversePlayer) => number,
  target: number,
): { kept: DemandUniversePlayer[]; evicted: DemandUniversePlayer[] } {
  const cardsByGroup = new Map<string, DemandUniversePlayer[]>();
  for (const player of players) {
    const groupId = demandVersionGroupId(player);
    cardsByGroup.set(groupId, [...(cardsByGroup.get(groupId) ?? []), player]);
  }
  const protectedGroups = new Set(
    players.filter((player) => protectedIds.has(player.id)).map(demandVersionGroupId),
  );
  const evictable = [...cardsByGroup.entries()]
    .filter(([groupId]) => !protectedGroups.has(groupId))
    .map(([groupId, cards]) => ({
      groupId,
      cards,
      fit: Math.max(...cards.map(fitOf)),
      salary: Math.max(...cards.map((player) => player.salary)),
    }))
    .sort((left, right) => {
      const fitDelta = left.fit - right.fit;
      if (Math.abs(fitDelta) > 1e-9) return fitDelta;
      if (left.salary !== right.salary) return right.salary - left.salary;
      return left.groupId.localeCompare(right.groupId);
    });
  const evicted: DemandUniversePlayer[] = [];
  for (const group of evictable) {
    if (cardsByGroup.size <= target) break;
    cardsByGroup.delete(group.groupId);
    evicted.push(...group.cards);
  }
  return {
    kept: [...cardsByGroup.values()].flat().sort((left, right) => left.id.localeCompare(right.id)),
    evicted: evicted.sort((left, right) => left.id.localeCompare(right.id)),
  };
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

function distinctPositionSupplyCount(
  players: readonly RosterSlotPlayer[],
  target: Pick<PositionSupplyFloorTarget, 'kind' | 'position'>,
): number {
  const matchingPeople = new Set<string>();
  players.forEach((player, index) => {
    if (!matchesPositionSupplyFloor(player, target)) return;
    const grouped = player as RosterSlotPlayer & { id?: string; versionGroupId?: string };
    matchingPeople.add(grouped.versionGroupId?.trim() || grouped.id || `row:${index}`);
  });
  return matchingPeople.size;
}

export function evaluatePositionSupplyFloors(
  players: readonly RosterSlotPlayer[],
  teamCount: number,
): PositionSupplyFloorResult[] {
  return deriveHardPositionSupplyFloorTargets(teamCount).map((target) => {
    const available = distinctPositionSupplyCount(players, target);
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
    const available = distinctPositionSupplyCount(players, target);
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
  evictedIds: string[];
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
  protectedIds?: ReadonlySet<string>;
  maxPeople?: number;
  tuning?: NumericPoolShapeTuning;
}): PositionSupplyFloorApplication {
  const current = new Map(options.players.map((player) => [player.id, player]));
  const currentGroups = demandVersionGroupIds(options.players);
  const excludedIds = options.excludedIds ?? new Set<string>();
  const fitOf = options.fitOf ?? (() => 0);
  const priorityIds = options.poolSourceMode === 'team-roster-priority'
    ? options.priorityIds ?? new Set<string>()
    : new Set<string>();
  const comparator = bySourceThenFitDescIdAsc(fitOf, priorityIds);
  const injectedIds: string[] = [];
  const evictedIds: string[] = [];
  const messages: string[] = [];
  const protectedIds = options.protectedIds ?? new Set<string>();
  const tuning = options.tuning ?? poolBalancePresetTuning();

  for (const target of derivePositionSupplyFloorTargets(options.teams)) {
    const currentPlayers = [...current.values()];
    const floor = evaluateCompetitivePositionSupplyFloors(currentPlayers, options.teams)
      .find((candidate) => candidate.kind === target.kind && candidate.position === target.position);
    const missing = floor?.missing ?? 0;
    if (missing <= 0) continue;
    const candidates = options.universe
      .filter((player) => !currentGroups.has(demandVersionGroupId(player)))
      .filter((player) => !excludedIds.has(player.id))
      .filter((player) => matchesPositionSupplyFloor(player, target))
      .sort(comparator);
    const picks = uniqueDemandCardsByVersionGroup(candidates, currentGroups);
    const injectedBefore = injectedIds.length;
    let rejectedAtExactSize = 0;
    for (const pick of picks) {
      if (injectedIds.length - injectedBefore >= missing) break;
      let evicted: DemandUniversePlayer | null = null;
      if (options.maxPeople !== undefined && currentGroups.size >= options.maxPeople) {
        const groupCounts = new Map<string, number>();
        for (const player of current.values()) {
          const groupId = demandVersionGroupId(player);
          groupCounts.set(groupId, (groupCounts.get(groupId) ?? 0) + 1);
        }
        const beforeFloors = evaluateCompetitivePositionSupplyFloors([...current.values()], options.teams);
        const beforeByKey = new Map(beforeFloors.map((entry) => [`${entry.kind}:${entry.position}`, entry]));
        const targetKey = `${target.kind}:${target.position}`;
        evicted = [...current.values()]
          .filter((player) => !protectedIds.has(player.id))
          .filter((player) => (groupCounts.get(demandVersionGroupId(player)) ?? 0) === 1)
          .filter((player) => doesNotIncreaseUpperTailOnSwap(
            [...current.values()],
            player,
            pick,
            tuning,
          ))
          .filter((player) => {
            const afterPlayers = [
              ...[...current.values()].filter((currentPlayer) => currentPlayer.id !== player.id),
              pick,
            ];
            const afterFloors = evaluateCompetitivePositionSupplyFloors(afterPlayers, options.teams);
            return afterFloors.every((after) => {
              const key = `${after.kind}:${after.position}`;
              const before = beforeByKey.get(key)?.missing ?? 0;
              return key === targetKey ? after.missing < before : after.missing <= before;
            });
          })
          .sort((left, right) => {
            const fitDelta = fitOf(left) - fitOf(right);
            if (Math.abs(fitDelta) > 1e-9) return fitDelta;
            if (left.salary !== right.salary) return right.salary - left.salary;
            return left.id.localeCompare(right.id);
          })[0] ?? null;
        if (!evicted) {
          rejectedAtExactSize += 1;
          continue;
        }
      }
      if (evicted) {
        current.delete(evicted.id);
        removeDemandGroupIfAbsent(current, currentGroups, evicted);
        evictedIds.push(evicted.id);
      }
      current.set(pick.id, pick);
      currentGroups.add(demandVersionGroupId(pick));
      injectedIds.push(pick.id);
      if (evicted) {
        messages.push(
          `position supply floor swapped in ${playerName(pick)} and removed ${playerName(evicted)} without growing the pool.`,
        );
      }
    }
    const targetAdded = injectedIds.length - injectedBefore;
    if (targetAdded > 0) {
      messages.push(
        `position supply floor added ${targetAdded} ${target.label.toLowerCase()} `
          + `(${floor?.available ?? 0}/${target.needed} before top-up).`,
      );
    }
    if (rejectedAtExactSize > 0) {
      messages.push(
        `position supply floor could not add ${rejectedAtExactSize} ${target.label.toLowerCase()} without growing the exact named pool; the shortfall remains.`,
      );
    }
  }

  const players = [...current.values()].sort((a, b) => a.id.localeCompare(b.id));
  const floors = evaluateCompetitivePositionSupplyFloors(players, options.teams);
  const shortfalls = floors.flatMap((floor) => {
    if (floor.missing <= 0) return [];
    const universeAvailable = options.universe
      .filter((player) => !excludedIds.has(player.id))
      .filter((player) => matchesPositionSupplyFloor(player, floor));
    const universeAvailablePeople = distinctPositionSupplyCount(universeAvailable, floor);
    return [{
      key: `position-floor:${floor.position}`,
      position: floor.position,
      wanted: floor.needed,
      available: universeAvailablePeople,
      message: `The uploaded universe has ${universeAvailablePeople} ${floor.label.toLowerCase()}; `
        + `${floor.needed} required for ${floor.teams} club${floor.teams === 1 ? '' : 's'} plus hoarding slack.`,
    }];
  });

  return {
    players,
    floors,
    injectedIds,
    evictedIds,
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

type DemandFitScorer = (player: DemandUniversePlayer) => number;

function selectIdentityBalancedCandidates(options: {
  candidates: readonly DemandUniversePlayer[];
  needed: number;
  windowId: string;
  fitScorers: readonly DemandFitScorer[];
  identityStartIndex?: number;
  generationNonce?: number;
}): DemandUniversePlayer[] {
  if (options.needed <= 0) return [];
  if (options.fitScorers.length === 0) {
    return selectWindowCandidates({
      ...options,
      candidates: uniqueDemandCardsByVersionGroup(options.candidates),
    });
  }
  const picked: DemandUniversePlayer[] = [];
  const pickedGroups = new Set<string>();
  const originalRank = new Map(options.candidates.map((player, index) => [player.id, index]));
  const nonce = Math.max(0, Math.floor(options.generationNonce ?? 0));
  const identityStartIndex = Math.max(0, Math.floor(options.identityStartIndex ?? 0));
  for (let cursor = 0; cursor < options.needed; cursor += 1) {
    const scorer = options.fitScorers[(identityStartIndex + cursor + nonce) % options.fitScorers.length];
    const eligible = options.candidates
      .filter((player) => !pickedGroups.has(demandVersionGroupId(player)))
      .sort((left, right) => {
        const fitDelta = scorer(right) - scorer(left);
        if (Math.abs(fitDelta) > 1e-9) return fitDelta;
        const rankDelta = (originalRank.get(left.id) ?? 0) - (originalRank.get(right.id) ?? 0);
        if (rankDelta !== 0) return rankDelta;
        return left.id.localeCompare(right.id);
      });
    const pick = selectWindowCandidates({
      candidates: eligible,
      needed: 1,
      windowId: options.windowId,
      generationNonce: nonce > 0 ? nonce + cursor : 0,
    })[0];
    if (!pick) break;
    picked.push(pick);
    pickedGroups.add(demandVersionGroupId(pick));
  }
  return picked;
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

function worstIdentityFitLoss(
  outgoing: DemandUniversePlayer,
  incoming: DemandUniversePlayer,
  fitScorers: readonly DemandFitScorer[],
): number {
  if (fitScorers.length === 0) return 0;
  return Math.max(...fitScorers.map((score) => score(outgoing) - score(incoming)));
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
  const curvePlayers = shapeRepresentativeUniverse(options.players, () => 0, poolQualityCenter);
  const numericGrades = curvePlayers.map(numericGradeOf);
  const denominator = numericGrades.length || 1;
  const highTailShare = numericGrades.filter((grade) => grade >= tuning.highTailMin).length / denominator;
  const superstarTailShare = numericGrades.filter((grade) => grade >= tuning.superstarTailMin).length / denominator;
  const middleMassShare = numericGrades.filter((grade) =>
    grade >= tuning.middleMin && grade < tuning.middleMax
  ).length / denominator;
  const lowTailShare = numericGrades.filter((grade) => grade < tuning.lowTailMax).length / denominator;
  const hardKeepPlayers = [...(options.hardKeepPlayers ?? [])];
  const hardKeepPeople = shapeRepresentativeUniverse(hardKeepPlayers, () => 0, poolQualityCenter);
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
  const engineGeneratedPeople = shapeRepresentativeUniverse(engineGeneratedPlayers, () => 0, poolQualityCenter);
  const selectedTeamRosterIds = options.selectedTeamRosterIds ?? new Set<string>();
  const hardKeepByBand = countPlayersByBand(hardKeepPeople, tuning);
  const engineGeneratedByBand = countPlayersByBand(engineGeneratedPeople, tuning);
  const finalPoolByBand = countPlayersByBand(curvePlayers, tuning);
  const targetBandCounts = targetCountsByBand(options.targetSize, tuning);
  const hardKeepShapeOverflowByBand: Record<string, number> = {};
  for (const [band, count] of Object.entries(hardKeepByBand)) {
    const overflow = count - (targetBandCounts[band] ?? 0);
    if (overflow > 0) hardKeepShapeOverflowByBand[band] = overflow;
  }
  const hardKeepOverflowCount = Math.max(0, hardKeepPeople.length - options.targetSize);
  const overTargetReason = curvePlayers.length > options.targetSize
    ? hardKeepOverflowCount > 0
      ? 'hardKeep overflow'
      : hardKeepPlayers.length > 0
        ? 'protected/manual keeps plus legal repair or curve violation'
        : 'legal repair or curve violation'
    : null;
  const positionRoleCoverage: Record<string, number> = {};
  for (const player of curvePlayers) {
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
    poolSize: curvePlayers.length,
    requiredRosterDemand: options.requiredRosterDemand,
    poolSlackFactor: options.requiredRosterDemand > 0 ? curvePlayers.length / options.requiredRosterDemand : 0,
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
    hardKeepCount: hardKeepPeople.length,
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
    qualityBandFinalCounts: countPlayersByWindow(curvePlayers, tuning.windows),
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
  teams?: number;
  fitOf: (player: DemandUniversePlayer) => number;
  identityFitScorers?: readonly DemandFitScorer[];
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
  const identityFitScorers = options.identityFitScorers ?? [];
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
  const selectedGroups = demandVersionGroupIds(protectedPlayers);
  const effectiveTarget = Math.max(0, Math.floor(options.targetSize));
  const windows = tuning.windows;
  const eligibleUniverse = options.universe.filter((player) => !excludedIds.has(player.id));
  const representativeUniverse = shapeRepresentativeUniverse(
    eligibleUniverse,
    options.fitOf,
    poolQualityCenter,
  );
  const protectedPeople = shapeRepresentativeUniverse(
    protectedPlayers,
    options.fitOf,
    poolQualityCenter,
  );
  const roleTargets = targetCountsByRoleBucket(
    representativeUniverse,
    effectiveTarget,
    options.teams ?? 0,
  );
  const quotaShortfalls: NumericPoolQuotaShortfall[] = [];
  const messages: string[] = [];
  let identitySelectionCursor = 0;

  for (const [bucket, bucketTarget] of Object.entries(roleTargets).sort(([a], [b]) => a.localeCompare(b))) {
    const bucketSource = options.universe.filter((player) => roleBucketOf(player) === bucket && !excludedIds.has(player.id));
    const windowTargets = targetCountsByWindow(bucketTarget, windows);
    const protectedCountsByWindow = Object.fromEntries(windows.map((window) => [
      window.id,
      protectedPeople.filter((player) => (
        roleBucketOf(player) === bucket
        && numericWindowId(numericGradeOf(player), windows) === window.id
      )).length,
    ])) as Record<string, number>;
    const protectedInBucket = Object.values(protectedCountsByWindow)
      .reduce((sum, count) => sum + count, 0);
    const remainingBucketNeed = Math.max(0, bucketTarget - protectedInBucket);
    const windowDeficits = windows.map((window) => ({
      id: window.id,
      count: Math.max(0, (windowTargets[window.id] ?? 0) - (protectedCountsByWindow[window.id] ?? 0)),
    }));
    const totalWindowDeficit = windowDeficits.reduce((sum, entry) => sum + entry.count, 0);
    const neededByWindow = totalWindowDeficit > 0
      ? largestRemainderCounts(
          windowDeficits.map((entry) => ({ id: entry.id, share: entry.count / totalWindowDeficit })),
          remainingBucketNeed,
        )
      : targetCountsByWindow(remainingBucketNeed, windows);
    for (const window of windows) {
      const targetCount = windowTargets[window.id] ?? 0;
      const protectedCount = protectedCountsByWindow[window.id] ?? 0;
      const needed = neededByWindow[window.id] ?? 0;
      if (targetCount <= 0 && needed <= 0) continue;
      const candidates = bucketSource
        .filter((player) => !selectedGroups.has(demandVersionGroupId(player)))
        .filter((player) => numericWindowId(numericGradeOf(player), windows) === window.id)
        .sort(fitComparator);
      const picks = selectIdentityBalancedCandidates({
        candidates,
        needed,
        windowId: `${bucket}|${window.id}`,
        fitScorers: identityFitScorers,
        identityStartIndex: identitySelectionCursor,
        generationNonce: options.generationNonce,
      });
      identitySelectionCursor += picks.length;
      for (const pick of picks) {
        selected.set(pick.id, pick);
        selectedGroups.add(demandVersionGroupId(pick));
      }
      if (picks.length < needed) {
        const availableGroups = demandVersionGroupIds(candidates).size;
        quotaShortfalls.push({
          roleBucket: bucket,
          windowId: window.id,
          minInclusive: window.minInclusive,
          maxExclusive: window.maxExclusive,
          targetCount: protectedCount + needed,
          protectedCount,
          selectedCount: protectedCount + picks.length,
          availableCount: protectedCount + availableGroups,
        });
      }
    }
  }

  // A role can miss one or more quality windows even when that role has enough people overall.
  // Fill the remaining role quota before the global fallback. Otherwise a missing RP window can be
  // replaced by an extra CP or hitter and silently undo the roster-demand role distribution.
  for (const [bucket, bucketTarget] of Object.entries(roleTargets).sort(([a], [b]) => a.localeCompare(b))) {
    const selectedInBucket = shapeRepresentativeUniverse(
      [...selected.values()],
      options.fitOf,
      poolQualityCenter,
    ).filter((player) => roleBucketOf(player) === bucket).length;
    const needed = Math.max(0, bucketTarget - selectedInBucket);
    if (needed === 0) continue;
    const candidates = options.universe
      .filter((player) => roleBucketOf(player) === bucket)
      .filter((player) => !selectedGroups.has(demandVersionGroupId(player)) && !excludedIds.has(player.id))
      .sort(fitComparator);
    const picks = selectIdentityBalancedCandidates({
      candidates,
      needed,
      windowId: `${bucket}|role-fallback`,
      fitScorers: identityFitScorers,
      identityStartIndex: identitySelectionCursor,
      generationNonce: options.generationNonce,
    });
    identitySelectionCursor += picks.length;
    for (const pick of picks) {
      selected.set(pick.id, pick);
      selectedGroups.add(demandVersionGroupId(pick));
    }
    if (picks.length > 0) {
      messages.push(
        `role quota fallback added ${picks.length} ${bucket} candidate${picks.length === 1 ? '' : 's'} after quality-window shortfalls.`,
      );
    }
  }

  if (selectedGroups.size < effectiveTarget) {
    const remaining = options.universe
      .filter((player) => !selectedGroups.has(demandVersionGroupId(player)) && !excludedIds.has(player.id))
      .sort((a, b) => {
        const aMiddle = numericGradeOf(a) >= tuning.middleMin && numericGradeOf(a) < tuning.middleMax;
        const bMiddle = numericGradeOf(b) >= tuning.middleMin && numericGradeOf(b) < tuning.middleMax;
        if (aMiddle !== bMiddle) return aMiddle ? -1 : 1;
        return fitComparator(a, b);
      });
    const uniqueRemaining = uniqueDemandCardsByVersionGroup(remaining, selectedGroups);
    const needed = effectiveTarget - selectedGroups.size;
    const picks = selectIdentityBalancedCandidates({
      candidates: remaining,
      needed,
      windowId: 'fallback',
      fitScorers: identityFitScorers,
      identityStartIndex: identitySelectionCursor,
      generationNonce: options.generationNonce,
    });
    identitySelectionCursor += picks.length;
    for (const pick of picks) {
      selected.set(pick.id, pick);
      selectedGroups.add(demandVersionGroupId(pick));
    }
    messages.push(
      `numeric grade quota fallback added ${Math.min(needed, uniqueRemaining.length)} deterministic source candidates after explicit quota shortfalls.`,
    );
  }

  if (selectedGroups.size > effectiveTarget) {
    const beforeTrim = selectedGroups.size;
    const trimmed = trimDemandPoolToPersonTarget(
      [...selected.values()],
      options.protectedIds,
      options.fitOf,
      effectiveTarget,
    );
    selected.clear();
    for (const player of trimmed.kept) selected.set(player.id, player);
    selectedGroups.clear();
    for (const groupId of demandVersionGroupIds(trimmed.kept)) selectedGroups.add(groupId);
    if (trimmed.evicted.length > 0) {
      messages.push(
        `numeric grade quotas selected ${beforeTrim - effectiveTarget} person${beforeTrim - effectiveTarget === 1 ? '' : 's'} above the target because protected distribution exceeded one or more role/window shares; trimmed ${demandVersionGroupIds(trimmed.evicted).size} unprotected person${demandVersionGroupIds(trimmed.evicted).size === 1 ? '' : 's'} by fit before price.`,
      );
    }
  }

  const highTailCapCount = Math.floor(effectiveTarget * tuning.highTailCap);
  const selectedCurvePeople = () => shapeRepresentativeUniverse(
    [...selected.values()],
    options.fitOf,
    poolQualityCenter,
  );
  let highTailCount = selectedCurvePeople()
    .filter((player) => numericGradeOf(player) >= tuning.highTailMin).length;
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
        .filter((player) => player.id !== highTailPlayer.id && !excludedIds.has(player.id))
        .filter((player) => (
          demandVersionGroupId(player) === demandVersionGroupId(highTailPlayer)
          || !selectedGroups.has(demandVersionGroupId(player))
        ))
        .filter((player) => numericGradeOf(player) < tuning.highTailMin)
        .filter((player) => preservesCompetitivePositionSupplyOnSwap(
          selectedCurvePeople(),
          highTailPlayer,
          player,
          options.teams ?? 0,
        ))
        .filter((player) => preservesBullpenRoleCountsOnSwap(
          selectedCurvePeople(),
          highTailPlayer,
          player,
        ))
        .sort((a, b) => {
          const identityLossDelta = worstIdentityFitLoss(highTailPlayer, a, identityFitScorers)
            - worstIdentityFitLoss(highTailPlayer, b, identityFitScorers);
          if (Math.abs(identityLossDelta) > 1e-9) return identityLossDelta;
          const aSamePerson = demandVersionGroupId(a) === demandVersionGroupId(highTailPlayer);
          const bSamePerson = demandVersionGroupId(b) === demandVersionGroupId(highTailPlayer);
          if (aSamePerson !== bSamePerson) return aSamePerson ? -1 : 1;
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
      removeDemandGroupIfAbsent(selected, selectedGroups, highTailPlayer);
      selected.set(replacement.id, replacement);
      selectedGroups.add(demandVersionGroupId(replacement));
      highTailCount = selectedCurvePeople()
        .filter((player) => numericGradeOf(player) >= tuning.highTailMin).length;
      swaps += 1;
    }
    if (swaps > 0) {
      messages.push(`numeric grade high-tail cap swapped ${swaps} excess high-end player${swaps === 1 ? '' : 's'} into non-high supply before G1 legality recheck.`);
    }
    if (highTailCount > highTailCapCount) {
      messages.push(
        `numeric grade high-tail cap still exceeds target by ${highTailCount - highTailCapCount}; protected players or selected-source position floors prevented further swaps.`,
      );
    }
  }

  const superstarCapCount = Math.floor(effectiveTarget * tuning.superstarTailCap);
  let superstarCount = selectedCurvePeople()
    .filter((player) => numericGradeOf(player) >= tuning.superstarTailMin).length;
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
        .filter((player) => player.id !== superstar.id && !excludedIds.has(player.id))
        .filter((player) => (
          demandVersionGroupId(player) === demandVersionGroupId(superstar)
          || !selectedGroups.has(demandVersionGroupId(player))
        ))
        .filter((player) => numericGradeOf(player) < tuning.superstarTailMin)
        .filter((player) => preservesCompetitivePositionSupplyOnSwap(
          selectedCurvePeople(),
          superstar,
          player,
          options.teams ?? 0,
        ))
        .filter((player) => preservesBullpenRoleCountsOnSwap(
          selectedCurvePeople(),
          superstar,
          player,
        ))
        .sort((a, b) => {
          const identityLossDelta = worstIdentityFitLoss(superstar, a, identityFitScorers)
            - worstIdentityFitLoss(superstar, b, identityFitScorers);
          if (Math.abs(identityLossDelta) > 1e-9) return identityLossDelta;
          const aSamePerson = demandVersionGroupId(a) === demandVersionGroupId(superstar);
          const bSamePerson = demandVersionGroupId(b) === demandVersionGroupId(superstar);
          if (aSamePerson !== bSamePerson) return aSamePerson ? -1 : 1;
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
      removeDemandGroupIfAbsent(selected, selectedGroups, superstar);
      selected.set(replacement.id, replacement);
      selectedGroups.add(demandVersionGroupId(replacement));
      superstarCount = selectedCurvePeople()
        .filter((player) => numericGradeOf(player) >= tuning.superstarTailMin).length;
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

  // Protected distributions can make the ideal role/window curve impossible at the fixed size.
  // Recompute from the final post-cap membership so diagnostics name every relaxed preference
  // without retaining a stale pre-trim or pre-swap quota result.
  quotaShortfalls.length = 0;
  const finalCurvePeople = selectedCurvePeople();
  const roleCount = (bucket: string) => finalCurvePeople
    .filter((player) => roleBucketOf(player) === bucket).length;
  const rosterRoleBuckets = Object.keys(roleTargets)
    .filter((bucket) => bucket.startsWith('arm:') || bucket.startsWith('pos:'))
    .sort((left, right) => left.localeCompare(right));
  const surplusRoles = rosterRoleBuckets
    .map((bucket) => ({ bucket, count: roleCount(bucket) - (roleTargets[bucket] ?? 0) }))
    .filter((entry) => entry.count > 0);
  const deficitRoles = rosterRoleBuckets
    .map((bucket) => ({ bucket, count: (roleTargets[bucket] ?? 0) - roleCount(bucket) }))
    .filter((entry) => entry.count > 0);
  const roleList = (entries: readonly { bucket: string; count: number }[]) => entries
    .map((entry) => `${entry.count} ${entry.bucket.replace(/^(?:arm|pos):/, '')}`)
    .join(' + ');
  if (surplusRoles.length > 0 || deficitRoles.length > 0) {
    const remove = surplusRoles.length > 0 ? `Remove ${roleList(surplusRoles)}` : '';
    const add = deficitRoles.length > 0
      ? `${remove ? 'add' : 'Add'} ${roleList(deficitRoles)}`
      : '';
    messages.push(`${remove}${remove && add ? ' and ' : ''}${add} to balance rosters.`);
  }
  for (const [bucket, bucketTarget] of Object.entries(roleTargets).sort(([a], [b]) => a.localeCompare(b))) {
    const bucketSource = representativeUniverse.filter((player) => roleBucketOf(player) === bucket);
    const windowTargets = targetCountsByWindow(bucketTarget, windows);
    for (const window of windows) {
      const targetCount = windowTargets[window.id] ?? 0;
      if (targetCount <= 0) continue;
      const selectedCount = finalCurvePeople.filter((player) =>
        roleBucketOf(player) === bucket && numericWindowId(numericGradeOf(player), windows) === window.id
      ).length;
      if (selectedCount >= targetCount) continue;
      const protectedCount = protectedPeople.filter((player) =>
        roleBucketOf(player) === bucket && numericWindowId(numericGradeOf(player), windows) === window.id
      ).length;
      const availableCount = bucketSource.filter((player) =>
        numericWindowId(numericGradeOf(player), windows) === window.id
      ).length;
      quotaShortfalls.push({
        roleBucket: bucket,
        windowId: window.id,
        minInclusive: window.minInclusive,
        maxExclusive: window.maxExclusive,
        targetCount,
        protectedCount,
        selectedCount,
        availableCount,
      });
    }
  }

  if (protectedPeople.length > effectiveTarget) {
    messages.push(
      `protected classes already exceed the numeric target by ${protectedPeople.length - effectiveTarget}; protected asks, claims, floors, and pins were preserved.`,
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

function uniqueDemandIdentityReference(
  universe: readonly DemandUniversePlayer[],
  score: DemandFitScorer,
): DemandUniversePlayer[] {
  const bestByGroup = new Map<string, DemandUniversePlayer>();
  for (const player of universe) {
    const groupId = demandVersionGroupId(player);
    const current = bestByGroup.get(groupId);
    if (!current || score(player) > score(current) + 1e-9
      || (Math.abs(score(player) - score(current)) <= 1e-9
        && (player.iv > current.iv + 1e-9
          || (Math.abs(player.iv - current.iv) <= 1e-9 && player.id.localeCompare(current.id) < 0)))) {
      bestByGroup.set(groupId, player);
    }
  }
  return [...bestByGroup.values()].sort((left, right) => left.id.localeCompare(right.id));
}

interface DemandIdentityFitModel {
  scorer: DemandFitScorer;
  reference: DemandUniversePlayer[];
}

function makeIdentityFitModels(
  selectedArchetypes: readonly HistoricalArchetype[],
  tier: TierKey,
  posture: RosterPosture,
  universe: readonly DemandUniversePlayer[],
): DemandIdentityFitModel[] {
  return selectedArchetypes.map((archetype) => {
    const simArchetype = historicalToSimArchetype(archetype);
    const representativeScore = archetypeFitScorer(simArchetype, tier, 'optimal');
    const reference = uniqueDemandIdentityReference(universe, representativeScore);
    return {
      scorer: archetypeFitScorer(simArchetype, tier, posture, reference),
      reference,
    };
  });
}

function makeMaxFitOf(
  fitScorers: readonly DemandFitScorer[],
): (player: DemandUniversePlayer) => number {
  if (fitScorers.length === 0) return () => 0;
  return (player) => Math.max(...fitScorers.map((score) => score(player)));
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

function mergeCountRecords(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): Record<string, number> {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Object.fromEntries([...keys].sort((a, b) => a.localeCompare(b)).map((key) => [
    key,
    (left[key] ?? 0) + (right[key] ?? 0),
  ]));
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
  teams: number;
  fitOf: (player: DemandUniversePlayer) => number;
  tuning?: NumericPoolShapeTuning;
}): DemandUniversePlayer | null {
  const incomingBucket = roleBucketOf(options.incoming);
  const windows = (options.tuning ?? poolBalancePresetTuning()).windows;
  const incomingWindow = numericWindowIdOf(options.incoming, windows);
  return options.currentPlayers
    .filter((player) => !options.protectedIds.has(player.id))
    .filter((player) => isLowTailWindow(numericWindowIdOf(player, windows)))
    .filter((player) => preservesCompetitivePositionSupplyOnSwap(
      options.currentPlayers,
      player,
      options.incoming,
      options.teams,
    ))
    .filter((player) => preservesBullpenRoleCountsOnSwap(
      options.currentPlayers,
      player,
      options.incoming,
    ))
    .filter((player) => doesNotIncreaseUpperTailOnSwap(
      options.currentPlayers,
      player,
      options.incoming,
      options.tuning ?? poolBalancePresetTuning(),
    ))
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

function preservesCompetitivePositionSupplyOnSwap(
  currentPlayers: readonly DemandUniversePlayer[],
  outgoing: DemandUniversePlayer,
  incoming: DemandUniversePlayer,
  teams: number,
): boolean {
  const before = new Map(evaluateCompetitivePositionSupplyFloors(currentPlayers, teams).map((floor) => [
    `${floor.kind}:${floor.position}`,
    floor.missing,
  ]));
  const afterPlayers = [
    ...currentPlayers.filter((player) => player.id !== outgoing.id),
    incoming,
  ];
  return evaluateCompetitivePositionSupplyFloors(afterPlayers, teams).every((floor) => (
    floor.missing <= (before.get(`${floor.kind}:${floor.position}`) ?? 0)
  ));
}

function preservesBullpenRoleCountsOnSwap(
  currentPlayers: readonly DemandUniversePlayer[],
  outgoing: DemandUniversePlayer,
  incoming: DemandUniversePlayer,
): boolean {
  const counts = (players: readonly DemandUniversePlayer[]) => ({
    closers: players.filter((player) => roleBucketOf(player) === 'arm:CP').length,
    ordinaryOrSwing: players.filter((player) => (
      roleBucketOf(player) === 'arm:RP' || roleBucketOf(player) === 'arm:SP/RP'
    )).length,
  });
  const before = counts(currentPlayers);
  const after = counts([
    ...currentPlayers.filter((player) => player.id !== outgoing.id),
    incoming,
  ]);
  return after.closers === before.closers && after.ordinaryOrSwing === before.ordinaryOrSwing;
}

function doesNotIncreaseUpperTailOnSwap(
  currentPlayers: readonly DemandUniversePlayer[],
  outgoing: DemandUniversePlayer,
  incoming: DemandUniversePlayer,
  tuning: NumericPoolShapeTuning,
): boolean {
  const counts = (players: readonly DemandUniversePlayer[]) => ({
    highTail: players.filter((player) => numericGradeOf(player) >= tuning.highTailMin).length,
    superstarTail: players.filter((player) => numericGradeOf(player) >= tuning.superstarTailMin).length,
  });
  const before = counts(currentPlayers);
  const after = counts([
    ...currentPlayers.filter((player) => player.id !== outgoing.id),
    incoming,
  ]);
  return after.highTail <= before.highTail && after.superstarTail <= before.superstarTail;
}

function repairSelectedIdentityCoverage(options: {
  universe: readonly DemandUniversePlayer[];
  players: readonly DemandUniversePlayer[];
  selectedArchetypes: readonly HistoricalArchetype[];
  tier: TierKey;
  posture: RosterPosture;
  budgetPerTeam: number;
  teams: number;
  protectedIds: ReadonlySet<string>;
  excludedIds: ReadonlySet<string>;
  fitScorers: readonly DemandFitScorer[];
  identityReferences: readonly (readonly DemandUniversePlayer[])[];
  tuning: NumericPoolShapeTuning;
}): {
  players: DemandUniversePlayer[];
  swaps: Array<{ outgoingId: string; incomingId: string; archetypeId: string }>;
  messages: string[];
} {
  if (
    options.selectedArchetypes.length === 0
    || options.fitScorers.length !== options.selectedArchetypes.length
    || options.identityReferences.length !== options.selectedArchetypes.length
    || options.teams <= 0
    || !Number.isFinite(options.budgetPerTeam)
  ) {
    return { players: [...options.players], swaps: [], messages: [] };
  }
  const current = new Map(options.players.map((player) => [player.id, player]));
  const selectedGroups = demandVersionGroupIds(options.players);
  const repairProtectedIds = new Set(options.protectedIds);
  const referenceByArchetypeId = new Map(options.selectedArchetypes.map((archetype, index) => [
    archetype.id,
    [...options.identityReferences[index]],
  ]));
  const swaps: Array<{ outgoingId: string; incomingId: string; archetypeId: string }> = [];
  const rank = () => options.selectedArchetypes.flatMap((archetype) => rankArchetypeDraftability(
    [...current.values()],
    [archetype],
    options.tier,
    {
      realTeamCount: options.teams,
      posture: options.posture,
      budgetOverride: options.budgetPerTeam,
      embodimentReference: [...(referenceByArchetypeId.get(archetype.id) ?? options.universe)],
    },
  ));
  let locked = rank().filter((verdict) => verdict.band === 'LOCKED');
  const curveCounts = (players: readonly DemandUniversePlayer[]) => ({
    high: players.filter((player) => numericGradeOf(player) >= options.tuning.highTailMin).length,
    superstar: players.filter((player) => numericGradeOf(player) >= options.tuning.superstarTailMin).length,
    low: players.filter((player) => numericGradeOf(player) < options.tuning.lowTailMax).length,
    middle: players.filter((player) => {
      const grade = numericGradeOf(player);
      return grade >= options.tuning.middleMin && grade < options.tuning.middleMax;
    }).length,
  });
  const preservesFinalShape = (
    beforePlayers: readonly DemandUniversePlayer[],
    afterPlayers: readonly DemandUniversePlayer[],
  ) => {
    const before = curveCounts(beforePlayers);
    const after = curveCounts(afterPlayers);
    if (
      after.high > before.high
      || after.superstar > before.superstar
      || after.low > before.low
      || after.middle < before.middle
    ) return false;
    const missingBefore = new Map(evaluateCompetitivePositionSupplyFloors(beforePlayers, options.teams).map((floor) => [
      `${floor.kind}:${floor.position}`,
      floor.missing,
    ]));
    if (evaluateCompetitivePositionSupplyFloors(afterPlayers, options.teams).some((floor) => (
      floor.missing > (missingBefore.get(`${floor.kind}:${floor.position}`) ?? 0)
    ))) return false;
    const bullpenCounts = (players: readonly DemandUniversePlayer[]) => ({
      closers: players.filter((player) => roleBucketOf(player) === 'arm:CP').length,
      ordinaryOrSwing: players.filter((player) => (
        roleBucketOf(player) === 'arm:RP' || roleBucketOf(player) === 'arm:SP/RP'
      )).length,
    });
    const bullpenBefore = bullpenCounts(beforePlayers);
    const bullpenAfter = bullpenCounts(afterPlayers);
    return bullpenAfter.closers === bullpenBefore.closers
      && bullpenAfter.ordinaryOrSwing === bullpenBefore.ordinaryOrSwing;
  };
  for (let round = 0; round < 3 && locked.length > 0; round += 1) {
    let roundSwaps = 0;
    for (const verdict of locked) {
      const archetypeIndex = options.selectedArchetypes.findIndex((archetype) => archetype.id === verdict.archetypeId);
      if (archetypeIndex < 0) continue;
      const archetype = options.selectedArchetypes[archetypeIndex];
      const scorer = options.fitScorers[archetypeIndex];
      const identityReference = referenceByArchetypeId.get(archetype.id) ?? [...options.universe];
      const sourceBuild = buildIdentityRoster(
        [...identityReference],
        historicalToSimArchetype(archetype),
        options.tier,
        options.budgetPerTeam,
        {
          realTeamCount: options.teams,
          posture: options.posture,
          embodimentReference: [...identityReference],
        },
      );
      for (let repair = 0; repair < 3; repair += 1) {
        const currentPlayers = [...current.values()];
        const pairedVersionTransfers = sourceBuild.players
          .filter((incoming): incoming is DemandUniversePlayer => 'profile' in incoming)
          .filter((incoming) => !current.has(incoming.id) && !options.excludedIds.has(incoming.id))
          .flatMap((incoming) => {
            const incomingGroup = demandVersionGroupId(incoming);
            const selectedSibling = currentPlayers.find((player) => demandVersionGroupId(player) === incomingGroup);
            if (!selectedSibling || options.protectedIds.has(selectedSibling.id)) return [];
            if (numericBandOf(selectedSibling, options.tuning) === numericBandOf(incoming, options.tuning)) return [];
            return currentPlayers
              .filter((donor) => donor.id !== selectedSibling.id && !options.protectedIds.has(donor.id))
              .flatMap((donor) => options.universe
                .filter((replacement) => demandVersionGroupId(replacement) === demandVersionGroupId(donor))
                .filter((replacement) => replacement.id !== donor.id && !options.excludedIds.has(replacement.id))
                .map((replacement) => {
                  const afterPlayers = currentPlayers
                    .filter((player) => player.id !== selectedSibling.id && player.id !== donor.id)
                    .concat(incoming, replacement);
                  return {
                    selectedSibling,
                    incoming,
                    donor,
                    replacement,
                    afterPlayers,
                    gain: scorer(incoming) + scorer(replacement) - scorer(selectedSibling) - scorer(donor),
                    otherIdentityLoss: Math.max(...options.fitScorers.map((identityScorer) => (
                      identityScorer(selectedSibling) + identityScorer(donor)
                      - identityScorer(incoming) - identityScorer(replacement)
                    ))),
                    replacesRepairKeep: repairProtectedIds.has(selectedSibling.id)
                      || repairProtectedIds.has(donor.id),
                  };
                })
                .filter((pair) => pair.gain > 1e-9)
                .filter((pair) => !pair.replacesRepairKeep || pair.otherIdentityLoss <= 1e-9)
                .filter((pair) => preservesFinalShape(currentPlayers, pair.afterPlayers)))
          })
          .sort((left, right) => (
            right.gain - left.gain
            || left.otherIdentityLoss - right.otherIdentityLoss
            || left.incoming.id.localeCompare(right.incoming.id)
            || left.replacement.id.localeCompare(right.replacement.id)
          ));
        const transfer = pairedVersionTransfers[0];
        if (transfer) {
          current.delete(transfer.selectedSibling.id);
          current.delete(transfer.donor.id);
          repairProtectedIds.delete(transfer.selectedSibling.id);
          repairProtectedIds.delete(transfer.donor.id);
          removeDemandGroupIfAbsent(current, selectedGroups, transfer.selectedSibling);
          removeDemandGroupIfAbsent(current, selectedGroups, transfer.donor);
          current.set(transfer.incoming.id, transfer.incoming);
          current.set(transfer.replacement.id, transfer.replacement);
          selectedGroups.add(demandVersionGroupId(transfer.incoming));
          selectedGroups.add(demandVersionGroupId(transfer.replacement));
          repairProtectedIds.add(transfer.incoming.id);
          repairProtectedIds.add(transfer.replacement.id);
          swaps.push({
            outgoingId: transfer.selectedSibling.id,
            incomingId: transfer.incoming.id,
            archetypeId: archetype.id,
          });
          swaps.push({
            outgoingId: transfer.donor.id,
            incomingId: transfer.replacement.id,
            archetypeId: archetype.id,
          });
          roundSwaps += 2;
          continue;
        }
        const pairs = sourceBuild.players
          .filter((incoming): incoming is DemandUniversePlayer => 'profile' in incoming)
          .filter((incoming) => !current.has(incoming.id) && !options.excludedIds.has(incoming.id))
          .flatMap((incoming) => {
            const incomingGroup = demandVersionGroupId(incoming);
            const selectedSibling = currentPlayers.find((player) => demandVersionGroupId(player) === incomingGroup);
            if (selectedGroups.has(incomingGroup) && !selectedSibling) return [];
            const outgoingCandidates = selectedSibling ? [selectedSibling] : currentPlayers;
            return outgoingCandidates
              .filter((outgoing) => !options.protectedIds.has(outgoing.id))
              .filter((outgoing) => numericBandOf(outgoing, options.tuning) === numericBandOf(incoming, options.tuning))
              .filter((outgoing) => preservesCompetitivePositionSupplyOnSwap(
                currentPlayers,
                outgoing,
                incoming,
                options.teams,
              ))
              .filter((outgoing) => preservesBullpenRoleCountsOnSwap(currentPlayers, outgoing, incoming))
              .filter((outgoing) => doesNotIncreaseUpperTailOnSwap(
                currentPlayers,
                outgoing,
                incoming,
                options.tuning,
              ))
              .map((outgoing) => ({
                outgoing,
                incoming,
                gain: scorer(incoming) - scorer(outgoing),
                otherIdentityLoss: worstIdentityFitLoss(outgoing, incoming, options.fitScorers),
                replacesRepairKeep: repairProtectedIds.has(outgoing.id),
                sameGroup: demandVersionGroupId(outgoing) === incomingGroup,
                sameRole: roleBucketOf(outgoing) === roleBucketOf(incoming),
              }))
              .filter((pair) => pair.gain > 1e-9)
              .filter((pair) => !pair.replacesRepairKeep || pair.otherIdentityLoss <= 1e-9);
          })
          .sort((left, right) => (
            right.gain - left.gain
            || left.otherIdentityLoss - right.otherIdentityLoss
            || Number(right.sameGroup) - Number(left.sameGroup)
            || Number(right.sameRole) - Number(left.sameRole)
            || left.incoming.id.localeCompare(right.incoming.id)
            || left.outgoing.id.localeCompare(right.outgoing.id)
          ));
        const pair = pairs[0];
        if (!pair) break;
        current.delete(pair.outgoing.id);
        repairProtectedIds.delete(pair.outgoing.id);
        removeDemandGroupIfAbsent(current, selectedGroups, pair.outgoing);
        current.set(pair.incoming.id, pair.incoming);
        selectedGroups.add(demandVersionGroupId(pair.incoming));
        repairProtectedIds.add(pair.incoming.id);
        swaps.push({
          outgoingId: pair.outgoing.id,
          incomingId: pair.incoming.id,
          archetypeId: archetype.id,
        });
        roundSwaps += 1;
      }
    }
    if (roundSwaps === 0) break;
    locked = rank().filter((verdict) => verdict.band === 'LOCKED');
  }
  return {
    players: [...current.values()].sort((left, right) => left.id.localeCompare(right.id)),
    swaps,
    messages: swaps.length > 0
      ? [`identity-balanced shaping exchanged ${swaps.length} curve-neutral source card${swaps.length === 1 ? '' : 's'} before the final certificate.`]
      : [],
  };
}

function selectSwapDownEvictionCandidate(
  currentPlayers: readonly DemandUniversePlayer[],
  protectedIds: ReadonlySet<string>,
  slot: DesignSlot | null,
  incoming: DemandUniversePlayer,
  teams: number,
  tuning: NumericPoolShapeTuning,
): DemandUniversePlayer | null {
  const classSlots = repairClassSlots(slot, incoming);
  return currentPlayers
    .filter((player) => !protectedIds.has(player.id))
    .filter((player) => player.salary > incoming.salary)
    .filter((player) => classSlots.some((candidateSlot) => eligibleForRepairGroup(candidateSlot, player)))
    .filter((player) => preservesCompetitivePositionSupplyOnSwap(currentPlayers, player, incoming, teams))
    .filter((player) => preservesBullpenRoleCountsOnSwap(currentPlayers, player, incoming))
    .filter((player) => doesNotIncreaseUpperTailOnSwap(currentPlayers, player, incoming, tuning))
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
  const requestedSlackFactor = requiredRosterDemand > 0
    ? targetSize / requiredRosterDemand
    : 0;
  const allowedFinalSlackFactor = Math.max(maxRepairSlackFactor, requestedSlackFactor);
  const repairGrowthAllowed = options.repairGrowthAllowed ?? true;
  const maxRepairSize = requiredRosterDemand > 0
    ? Math.max(targetSize, Math.floor(requiredRosterDemand * maxRepairSlackFactor))
    : Number.POSITIVE_INFINITY;
  const current = new Map(options.players.map((player) => [player.id, player]));
  const currentGroups = demandVersionGroupIds(options.players);
  let g1 = runG1Check([...current.values()].sort((a, b) => a.id.localeCompare(b.id)), options.teams, options.budget);
  const messages: string[] = [];
  const injectedIds: string[] = [];
  const evictedIds: string[] = [];
  const additionsByRoleWindow: Record<string, number> = {};
  const removalsByRoleWindow: Record<string, number> = {};
  const lowTailAdditionsByRole: Record<string, number> = {};
  const swaps: NumericPoolRepairSwap[] = [];
  const curveViolations: NumericPoolCurveViolation[] = [];
  const retiredRepairGroups = new Set<string>();
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
        .filter((player) => !currentGroups.has(demandVersionGroupId(player)))
        .filter((player) => !retiredRepairGroups.has(demandVersionGroupId(player)))
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
      const orderedRepairCandidates = isOverrunRepair
        ? [...repairCandidates].sort((left, right) => {
            const leftLowTail = isLowTailWindow(numericWindowIdOf(left, tuning.windows));
            const rightLowTail = isLowTailWindow(numericWindowIdOf(right, tuning.windows));
            if (leftLowTail !== rightLowTail) return leftLowTail ? 1 : -1;
            if (left.salary !== right.salary) return left.salary - right.salary;
            const fitDelta = options.fitOf(right) - options.fitOf(left);
            if (Math.abs(fitDelta) > 1e-9) return fitDelta;
            return left.id.localeCompare(right.id);
          })
        : repairCandidates;
      let chosen = orderedRepairCandidates[0] ?? null;
      if (!chosen) continue;
      const lastResort = fitQualified.length === 0;
      if (isOverrunRepair) {
        let evicted: DemandUniversePlayer | null = null;
        for (const candidate of orderedRepairCandidates) {
          const candidateEviction = selectSwapDownEvictionCandidate(
            [...current.values()],
            options.protectedIds,
            slot,
            candidate,
            options.teams,
            tuning,
          );
          if (!candidateEviction) continue;
          chosen = candidate;
          evicted = candidateEviction;
          break;
        }
        if (!evicted) continue;
        const chosenWindow = numericWindowIdOf(chosen, tuning.windows);
        const chosenRole = roleBucketOf(chosen);
        current.set(chosen.id, chosen);
        currentGroups.add(demandVersionGroupId(chosen));
        current.delete(evicted.id);
        removeDemandGroupIfAbsent(current, currentGroups, evicted);
        retiredRepairGroups.add(demandVersionGroupId(evicted));
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
        const chosenWindow = numericWindowIdOf(chosen, tuning.windows);
        const chosenRole = roleBucketOf(chosen);
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
            teams: options.teams,
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
        currentGroups.add(demandVersionGroupId(chosen));
        injectedIds.push(chosen.id);
        incrementCount(additionsByRoleWindow, roleWindowKey(chosen, tuning.windows));
        if (isLowTailWindow(chosenWindow)) incrementCount(lowTailAdditionsByRole, chosenRole);
        if (evicted) {
          current.delete(evicted.id);
          removeDemandGroupIfAbsent(current, currentGroups, evicted);
          retiredRepairGroups.add(demandVersionGroupId(evicted));
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
  const finalCurvePlayers = shapeRepresentativeUniverse(finalPlayers, () => 0, poolQualityCenter);
  const curveCount = Math.max(1, finalCurvePlayers.length);
  const discreteMinimumShare = (target: number): number => Math.floor(target * curveCount) / curveCount;
  const discreteMaximumShare = (cap: number): number => Math.ceil(cap * curveCount) / curveCount;
  if (finalSnapshot.middleMassShare + 1e-9 < discreteMinimumShare(tuning.targetMiddleMass)) {
    curveViolations.push({
      code: 'MIDDLE_MASS_TARGET_MISSED',
      message: `post-repair middle mass ${(finalSnapshot.middleMassShare * 100).toFixed(1)}% is below ${(tuning.targetMiddleMass * 100).toFixed(0)}%.`,
    });
  }
  if (finalSnapshot.lowTailShare > discreteMaximumShare(tuning.lowTailRepairCap) + 1e-9) {
    curveViolations.push({
      code: 'LOW_TAIL_CAP_EXCEEDED',
      message: `post-repair low tail ${(finalSnapshot.lowTailShare * 100).toFixed(1)}% exceeds ${(tuning.lowTailRepairCap * 100).toFixed(0)}%.`,
    });
  }
  if (finalSnapshot.highTailShare > discreteMaximumShare(tuning.highTailCap) + 1e-9) {
    curveViolations.push({
      code: 'HIGH_TAIL_CAP_EXCEEDED',
      message: `post-repair high tail ${(finalSnapshot.highTailShare * 100).toFixed(1)}% exceeds ${(tuning.highTailCap * 100).toFixed(0)}%.`,
    });
  }
  const superstarTailShare = finalCurvePlayers.length > 0
    ? finalCurvePlayers.filter((player) => numericGradeOf(player) >= tuning.superstarTailMin).length / finalCurvePlayers.length
    : 0;
  if (superstarTailShare > discreteMaximumShare(tuning.superstarTailCap) + 1e-9) {
    curveViolations.push({
      code: 'SUPERSTAR_TAIL_CAP_EXCEEDED',
      message: `post-repair superstar tail ${(superstarTailShare * 100).toFixed(1)}% exceeds ${(tuning.superstarTailCap * 100).toFixed(0)}%.`,
    });
  }
  if (finalSnapshot.poolSlackFactor > allowedFinalSlackFactor + 1e-9) {
    curveViolations.push({
      code: 'REPAIR_GROWTH_LIMIT',
      message: `post-repair slack ${finalSnapshot.poolSlackFactor.toFixed(2)}x exceeds allowed slack ${allowedFinalSlackFactor.toFixed(2)}x.`,
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
    preserveSelectedIdentityClaims?: boolean;
    /**
     * Snake named-pool builds certify the finished shaped membership with the authoritative
     * simultaneous seating proof. They must not require the richer source shelf to pass first.
     */
    deferIdentityToFinalProof?: boolean;
    /** Exact disjoint ids from the authoritative all-club Snake seating certificate. */
    identitySupportIds?: string[];
    /** Fingerprint binding those ids to the exact validated Full Sources shaping input. */
    identitySupportReceipt?: PoolIdentitySupportReceipt;
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
  const requestedIdentitySupportIds = new Set(options.identitySupportIds ?? []);
  const supportReceiptIds = options.identitySupportReceipt?.playerIds ?? [];
  const certifiedIdentitySupport = options.identitySupportReceipt?.version === 1
    && options.identitySupportReceipt.authorityFingerprint.length > 0
    && supportReceiptIds.length === requestedIdentitySupportIds.size
    && supportReceiptIds.every((id) => requestedIdentitySupportIds.has(id))
    && options.identitySupportReceipt.sourceFingerprint === poolIdentitySupportFingerprint({
      universe,
      selectedArchetypes,
      tier,
      teams: teamsForSizing,
      budgetPerTeam: options.budgetPerTeam,
      playerIds: supportReceiptIds,
      authorityFingerprint: options.identitySupportReceipt.authorityFingerprint,
    });
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
  // A Snake shaped build can arrive with the exact disjoint ids from an already-validated
  // Full Sources certificate. Re-running all selected identity optimizers here would merely
  // reconstruct the same claim set before the final shaped pool is validated against that
  // certificate. On large multi-source universes that duplicate work can hold the browser main
  // thread for minutes, so carry the certified support as the floor receipt instead.
  const floors: ExtractedPool = options.deferIdentityToFinalProof
    ? {
        players: [],
        size: 0,
        targetSize: 0,
        claimedIds: [],
        floorIds: [],
        verdicts: [],
        balanced: true,
        repairRounds: 0,
        notes: ['Identity is certified against the finished shaped Snake pool.'],
      }
    : certifiedIdentitySupport
    ? {
        players: universe.filter((player) => requestedIdentitySupportIds.has(player.id)),
        size: requestedIdentitySupportIds.size,
        targetSize: requestedIdentitySupportIds.size,
        claimedIds: [...requestedIdentitySupportIds].sort((a, b) => a.localeCompare(b)),
        floorIds: [],
        verdicts: [],
        balanced: true,
        repairRounds: 0,
        notes: ['Full Sources identity certificate support retained; duplicate identity extraction skipped.'],
      }
    : extractDraftPool(universe, selectedArchetypes, tier, {
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
  const preserveSelectedIdentityClaims = options.preserveSelectedIdentityClaims ?? false;
  const identityClaimedIds = new Set(preserveSelectedIdentityClaims ? floors.claimedIds : []);
  const structuralFloorIds = new Set(preserveSelectedIdentityClaims ? floors.floorIds : []);
  const explicitProtectedIdsForExclusions = new Set<string>([
    ...reservedIds,
    ...identityClaimedIds,
    ...structuralFloorIds,
    ...requestedIdentitySupportIds,
    ...(handReconcileEnabled ? requestedPinnedIds : []),
  ]);
  const effectiveExcludedIds = new Set(
    [...requestedExcludedIds].filter((id) => !explicitProtectedIdsForExclusions.has(id)),
  );
  // FINDING-215: selected identities and structural roster floors are hard membership,
  // including in numeric-shaping mode. The shaper may grow past its nominal target, but it
  // may never make a chosen club identity disappear by treating its exact build as a soft score.
  if (!sizingEnabled || preserveSelectedIdentityClaims) {
    for (const player of floors.players as DemandUniversePlayer[]) {
      if (!byId.has(player.id)) byId.set(player.id, player);
    }
  }
  if (requestedIdentitySupportIds.size > 0) {
    for (const { player } of classified) {
      if (requestedIdentitySupportIds.has(player.id)) byId.set(player.id, player);
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
  const identityFitModels = makeIdentityFitModels(selectedArchetypes, tier, posture, universe);
  const identityFitScorers = identityFitModels.map((model) => model.scorer);
  const identityReferences = identityFitModels.map((model) => model.reference);
  const fitOf = makeMaxFitOf(identityFitScorers);

  if (sizingEnabled) {
    const target = resolvePoolSizingTarget({
      teams: teamsForSizing,
      shills: options.shills ?? 0,
      poolSizeMultiplier: options.poolSizeMultiplier ?? poolShapeTuning.poolSlackFactor,
      sizeTarget: options.sizeTarget,
    });
    const protectedIds = new Set<string>([
      ...reservedIds,
      ...identityClaimedIds,
      ...structuralFloorIds,
      ...requestedIdentitySupportIds,
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
    const excludedForShape = handReconcileEnabled ? effectiveExcludedIds : new Set<string>();
    const preShapeFloorInjectedIds: string[] = [];
    const preShapeFloorMessages: string[] = [];
    if (requestedIdentitySupportIds.size > 0) {
      const floorSeed = enforcePositionSupplyFloors({
        universe,
        players,
        teams: teamsForSizing,
        fitOf,
        excludedIds: excludedForShape,
        priorityIds: requestedPriorityIds,
        poolSourceMode: options.poolSourceMode ?? 'full-pool',
      });
      players = floorSeed.players;
      for (const id of floorSeed.injectedIds) {
        protectedIds.add(id);
        preShapeFloorInjectedIds.push(id);
      }
      preShapeFloorMessages.push(...floorSeed.messages);
    }
    const beforeShape = players;
    const shaped = shapePoolByNumericGrade({
      universe,
      currentPlayers: players,
      protectedIds,
      excludedIds: excludedForShape,
      targetSize: target.effectiveTarget,
      requiredRosterDemand: target.demandBase,
      teams: teamsForSizing,
      fitOf,
      identityFitScorers,
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
    const messages: string[] = [...preShapeFloorMessages];
    if (target.clamped) {
      messages.push(trimClampMessage(target, target.effectiveTarget, options.budgetPerTeam ?? Number.POSITIVE_INFINITY));
    }
    messages.push(...numericShape.messages);
    const identityOverrideCount = [...requestedExcludedIds]
      .filter((id) => identityClaimedIds.has(id))
      .length;
    if (identityOverrideCount > 0) {
      messages.push(
        `${identityOverrideCount} manual removal${identityOverrideCount === 1 ? '' : 's'} stayed in because chosen club identities require ${identityOverrideCount === 1 ? 'that player' : 'those players'}.`,
      );
    }
    if (numericShape.quotaShortfalls.length > 0) {
      messages.push(
        `numeric grade quota shortfalls reported in ${numericShape.quotaShortfalls.length} role/window bucket${numericShape.quotaShortfalls.length === 1 ? '' : 's'}; fallback stayed deterministic and did not silently overfill stars or scrubs.`,
      );
    }
    if (players.length > target.effectiveTarget) {
      const protectedCount = players.filter((player) => protectedIds.has(player.id)).length;
      messages.push(
        protectedCount > target.effectiveTarget
          ? `pool exceeds the ${target.effectiveTarget} target by ${players.length - target.effectiveTarget}: protected asks, certificate support, position floors${handReconcileEnabled && players.some((player) => requestedPinnedIds.has(player.id)) ? ', or your own hand-picks' : ''} already exceed the target`
          : `pool exceeds the ${target.effectiveTarget} target by ${players.length - target.effectiveTarget} after numeric shaping even though ${players.length - protectedCount} players remain unprotected`,
      );
    }

    let injectedIds: string[] = [...preShapeFloorInjectedIds];
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
      injectedIds = [...new Set([...preShapeFloorInjectedIds, ...repair.injectedIds])]
        .sort((a, b) => a.localeCompare(b));
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
        g1AdditionCount: repair.injectedIds.length,
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
      protectedIds,
      maxPeople: target.effectiveTarget,
      tuning: poolShapeTuning,
    });
    players = floorTopUp.players;
    positionSupplyFloors = floorTopUp.floors;
    injectedIds = [...new Set([...injectedIds, ...floorTopUp.injectedIds])]
      .sort((a, b) => a.localeCompare(b));
    repairEvictedIds = [...new Set([...repairEvictedIds, ...floorTopUp.evictedIds])]
      .sort((a, b) => a.localeCompare(b));
    shortfalls.push(...floorTopUp.shortfalls);
    messages.push(...floorTopUp.messages);
    const identityRepair = options.deferIdentityToFinalProof
      ? repairSelectedIdentityCoverage({
          universe,
          players,
          selectedArchetypes,
          tier,
          posture,
          budgetPerTeam: options.budgetPerTeam ?? Number.POSITIVE_INFINITY,
          teams: teamsForSizing,
          protectedIds,
          excludedIds: excludedForShape,
          fitScorers: identityFitScorers,
          identityReferences,
          tuning: poolShapeTuning,
        })
      : { players, swaps: [], messages: [] };
    players = identityRepair.players;
    injectedIds = [...new Set([
      ...injectedIds,
      ...identityRepair.swaps.map((swap) => swap.incomingId),
    ])].sort((a, b) => a.localeCompare(b));
    repairEvictedIds = [...new Set([
      ...repairEvictedIds,
      ...identityRepair.swaps.map((swap) => swap.outgoingId),
    ])].sort((a, b) => a.localeCompare(b));
    messages.push(...identityRepair.messages);
    const finalIdentityG1Repair = identityRepair.swaps.length > 0 && Number.isFinite(budget)
      ? repairG1PoolForSizing({
          universe,
          players,
          protectedIds: new Set([
            ...protectedIds,
            ...identityRepair.swaps.map((swap) => swap.incomingId),
          ]),
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
          repairGrowthAllowed: false,
          failOnCurveViolation: options.failOnCurveViolation,
          preset: poolBalancePreset,
          poolQualityCenter,
          tuning: poolShapeTuning,
        })
      : null;
    if (finalIdentityG1Repair) {
      players = finalIdentityG1Repair.players;
      g1 = finalIdentityG1Repair.g1;
      injectedIds = [...new Set([
        ...injectedIds,
        ...finalIdentityG1Repair.injectedIds,
      ])].sort((a, b) => a.localeCompare(b));
      repairEvictedIds = [...new Set([
        ...repairEvictedIds,
        ...finalIdentityG1Repair.evictedIds,
      ])].sort((a, b) => a.localeCompare(b));
      messages.push(...finalIdentityG1Repair.messages);
    }
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
        messages: [
          ...numericShape.messages,
          ...floorTopUp.messages,
          ...identityRepair.messages,
          ...(finalIdentityG1Repair?.messages ?? []),
        ],
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
        g1AdditionsByRoleWindow: mergeCountRecords(
          numericShape.g1AdditionsByRoleWindow ?? {},
          finalIdentityG1Repair?.additionsByRoleWindow ?? {},
        ),
        g1RemovalsByRoleWindow: mergeCountRecords(
          numericShape.g1RemovalsByRoleWindow ?? {},
          finalIdentityG1Repair?.removalsByRoleWindow ?? {},
        ),
        g1LowTailAdditionsByRole: mergeCountRecords(
          numericShape.g1LowTailAdditionsByRole ?? {},
          finalIdentityG1Repair?.lowTailAdditionsByRole ?? {},
        ),
        g1Swaps: [
          ...(numericShape.g1Swaps ?? []),
          ...(finalIdentityG1Repair?.swaps ?? []),
        ],
        curveViolations: [
          ...(numericShape.curveViolations ?? []),
          ...(finalIdentityG1Repair?.curveViolations ?? []),
        ],
        g1AdditionCount: (numericShape.g1AdditionCount ?? 0)
          + (finalIdentityG1Repair?.injectedIds.length ?? 0),
        g1SwapCount: (numericShape.g1SwapCount ?? 0)
          + (finalIdentityG1Repair?.swaps.length ?? 0),
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
