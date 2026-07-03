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
  evaluateRosterDesign,
  type DesignFeasibilityResult,
  type DesignPoolPlayer,
  type DesignSlot,
  type SlotPreference,
} from './rosterDesignFeasibility';
import { extractDraftPool, type ExtractedPool } from './draftPoolExtractor';
import type { SimPlayer } from './archetypeBalanceSimulator';
import type { HistoricalArchetype } from '../data/historicalArchetypes';
import type { TierKey } from '../data/tierParams';

/** A universe player: sim/economy shape + the whole classifiable profile. */
export interface DemandUniversePlayer extends SimPlayer {
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
}

export interface ClassifiedDemandPlayer {
  player: DemandUniversePlayer;
  classification: ShapeClassification;
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
    budgetPerTeam?: number;
    contestMultiplier?: number;
  } = {},
): PoolFromDemandResult {
  const contest = options.contestMultiplier ?? POOL_FROM_DEMAND_TUNING.contestMultiplier;

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
      .filter(({ classification }) => demandCellMatches(classification, { ...preference, allowRunnerUp }))
      .map(({ player }) => player)
      .sort((a, b) => a.salary - b.salary || a.id.localeCompare(b.id));
    const wanted = Math.ceil(cell.asks * contest);
    const picks = priceSpread(matching, wanted);
    for (const pick of picks) reservedIds.add(pick.id);
    cells.push({ key, preference, slotIds: cell.slotIds, asks: cell.asks, wanted, reserved: picks.length });
    if (picks.length < wanted) {
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
  const players = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  // 6. Re-verify every human design against the FINAL pool (the hub-drift check).
  const designPool = players.map(toDesignPoolPlayer);
  const budget = options.budgetPerTeam ?? Number.POSITIVE_INFINITY;
  const designVerdicts = designs.map((design) => ({
    teamId: design.teamId,
    result: evaluateRosterDesign(design.slots, designPool, budget),
  }));

  return { players, size: players.length, floors, cells, shortfalls, designVerdicts };
}
