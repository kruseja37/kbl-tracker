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
 * balance verdicts, and `evaluateRosterDesign` verifies every human design against the
 * final pool. v1 choices (documented): CPU/shill clubs contribute NO shape-specific cells
 * (the extractor's floors already guarantee their completion — CPUs bid by band priorities,
 * not asks); the union is NOT trimmed to the sizing target (oversupply is safe, the league
 * owner edits before locking; trim-to-target is a v1.1 refinement).
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
import type { HistoricalArchetype } from '../data/historicalArchetypes';
import type { TierKey } from '../data/tierParams';
import { canCover, canRelieve, canStart, isCloser } from '../data/rosterConstruction';

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
  sizing?: PoolSizingResult;
  g1?: PoolG1Result;
}

export interface ClassifiedDemandPlayer {
  player: DemandUniversePlayer;
  classification: ShapeClassification;
}

export const POOL_SIZE_MULTIPLIER_STOPS = [1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5] as const;
export const DEFAULT_POOL_SIZE_MULTIPLIER = 1.35;

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
}): PoolG1RepairResult {
  const requestedExcludedIds = options.requestedExcludedIds ?? new Set<string>();
  let current = new Map(options.players.map((player) => [player.id, player]));
  let g1 = runG1Check([...current.values()].sort((a, b) => a.id.localeCompare(b.id)), options.teams, options.budget);
  const messages: string[] = [];
  const injectedIds: string[] = [];
  const evictedIds: string[] = [];
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
        .sort((a, b) => a.salary - b.salary || a.id.localeCompare(b.id));
      if (eligible.length === 0) continue;
      const repairPick = selectFitAwareRepairCandidate(eligible, currentMinFit, options.fitOf);
      const chosen = repairPick.player;
      if (!chosen) continue;
      if (isOverrunRepair) {
        const evicted = selectSwapDownEvictionCandidate([...current.values()], options.protectedIds, slot, chosen);
        if (!evicted) continue;
        current.set(chosen.id, chosen);
        current.delete(evicted.id);
        injectedIds.push(chosen.id);
        evictedIds.push(evicted.id);
        if (repairPick.lastResort) {
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
        if (repairPick.lastResort) {
          messages.push(
            `no affordable ${label} body also fits your league's identities — added the cheapest legal option (${playerName(chosen)}).`,
          );
        }
        current.set(chosen.id, chosen);
        injectedIds.push(chosen.id);
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
  return {
    players: [...current.values()].sort((a, b) => a.id.localeCompare(b.id)),
    g1,
    injectedIds,
    evictedIds,
    messages,
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
    poolSizeMultiplier?: number;
    sizeTarget?: number;
    maxRepairRounds?: number;
    posture?: RosterPosture;
    pinnedIds?: string[];
    excludedIds?: string[];
  } = {},
): PoolFromDemandResult {
  const contest = options.contestMultiplier ?? POOL_FROM_DEMAND_TUNING.contestMultiplier;
  const posture = options.posture ?? 'optimal';
  if (options.teams === undefined) {
    throw new PoolTeamsForSizingMissingError();
  }
  const teamsForSizing = Math.max(0, Math.floor(options.teams));
  const sizingEnabled = options.sizeTarget !== undefined || options.poolSizeMultiplier !== undefined;
  const handReconcileEnabled = Boolean(options.pinnedIds?.length || options.excludedIds?.length);
  const requestedPinnedIds = new Set(options.pinnedIds ?? []);
  const requestedExcludedIds = new Set(options.excludedIds ?? []);
  const poolMinSalary = universe.length > 0 ? Math.min(...universe.map((player) => player.salary)) : 0;

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

  // 5. Union + dedupe (reservation order first so cell picks always survive).
  const byId = new Map<string, DemandUniversePlayer>();
  for (const { player } of classified) {
    if (reservedIds.has(player.id)) byId.set(player.id, player);
  }
  for (const player of floors.players as DemandUniversePlayer[]) {
    if (!byId.has(player.id)) byId.set(player.id, player);
  }
  if (handReconcileEnabled) {
    for (const id of requestedExcludedIds) byId.delete(id);
    const classifiedById = new Map(classified.map(({ player }) => [player.id, player]));
    for (const id of [...requestedPinnedIds].sort((a, b) => a.localeCompare(b))) {
      if (requestedExcludedIds.has(id)) continue;
      const player = classifiedById.get(id);
      if (player) byId.set(id, player);
    }
  }
  let players = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  let sizing: PoolSizingResult | undefined;
  let g1: PoolG1Result | undefined;

  if (sizingEnabled) {
    const target = resolvePoolSizingTarget({
      teams: teamsForSizing,
      shills: options.shills ?? 0,
      poolSizeMultiplier: options.poolSizeMultiplier,
      sizeTarget: options.sizeTarget,
    });
    const protectedIds = new Set<string>([
      ...reservedIds,
      ...floors.claimedIds,
      ...floors.floorIds,
      ...(handReconcileEnabled ? requestedPinnedIds : []),
    ]);
    const fitOf = makeMaxFitOf(selectedArchetypes, tier, posture);
    const trimmed = trimPoolToTarget(players, protectedIds, fitOf, target.effectiveTarget);
    players = trimmed.kept;
    const messages: string[] = [];
    if (target.clamped) {
      messages.push(trimClampMessage(target, target.effectiveTarget, options.budgetPerTeam ?? Number.POSITIVE_INFINITY));
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
        requestedExcludedIds,
        teams: teamsForSizing,
        budget,
        maxRounds: options.maxRepairRounds ?? 6,
        poolMinSalary,
        fitOf,
        handReconcileEnabled,
      });
      players = repair.players;
      g1 = repair.g1;
      injectedIds = repair.injectedIds;
      repairEvictedIds = repair.evictedIds;
      messages.push(...repair.messages);
    }

    const finalSize = players.length;
    if (finalSize > target.ceilingTarget && !messages.some((message) => message.includes('Sized up to'))) {
      messages.push(trimClampMessage(target, finalSize, options.budgetPerTeam ?? Number.POSITIVE_INFINITY));
    }
    sizing = {
      ...target,
      finalSize,
      trimmedCount: trimmed.evicted.length,
      evictedIds: [...trimmed.evicted.map((player) => player.id), ...repairEvictedIds],
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

  // 6. Re-verify every human design against the FINAL pool (the hub-drift check).
  const designPool = players.map(toDesignPoolPlayer);
  const budget = options.budgetPerTeam ?? Number.POSITIVE_INFINITY;
  const designVerdicts = designs.map((design) => ({
    teamId: design.teamId,
    result: evaluateRosterDesign(design.slots, designPool, budget),
  }));

  return { players, size: players.length, floors, cells, shortfalls, designVerdicts, ...(sizing ? { sizing } : {}), ...(g1 ? { g1 } : {}) };
}
