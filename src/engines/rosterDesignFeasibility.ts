/**
 * ROSTER-DESIGN FEASIBILITY — the Assistant GM's calculation (JK re-sync 2026-07-02;
 * design: FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §4 S3, ASST_GM_DESIGN.md §6 `board`).
 *
 * The loop it powers: the GM sets a per-slot player-archetype design across the 22 roster
 * spots → this engine answers "can that design be filled from the ACTUAL pool, within
 * budget?" → infeasible designs come back with plain-language BLOCKERS naming what's in the
 * way → the GM adjusts → once feasible, the design board (per-slot picks) and per-position
 * pool rankings follow.
 *
 * v1 boundaries (documented, deliberate):
 * - Price basis = pool salary (the IV-derived ask). Live auction prices differ; the market
 *   model refines per lot in the room. This is the Asst GM's pre-draft ESTIMATE.
 * - The team archetype enters as ADVISORY alignment (cap identity shifts tax, not
 *   legality); tax-exact feasibility rides the live board (C4-B).
 * - Personality tilt is a SOFT preference (candidate ordering), never a hard filter — a
 *   tilt can't make a slot unfillable (the C3 anti-starve lesson).
 */

import {
  classifyPlayerArchetype,
  type ClassifiableProfile,
  type ShapeClassification,
} from './playerArchetypeClassifier';
import type { PersonalityTilt, TaxonomyPosition } from '../data/playerArchetypeTaxonomy';
import {
  canCover,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';

const HITTER_POSITIONS: readonly TaxonomyPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export interface DesignPoolPlayer {
  id: string;
  name?: string;
  salary: number;
  profile: ClassifiableProfile;
  /** Ruling-A coverage shape for legality (position/secondary/two-way). */
  slotPlayer: RosterSlotPlayer;
}

export interface SlotPreference {
  shape?: string;
  /** Accept the classifier's runner-up as a match (default true — near-misses count). */
  allowRunnerUp?: boolean;
  tags?: {
    bats?: 'L' | 'R' | 'S';
    leftArm?: boolean;
    utility?: boolean;
    twoWay?: boolean;
    platoonSide?: 'vs-LHP' | 'vs-RHP';
  };
  personalityTilt?: PersonalityTilt;
}

export type DesignSlotKind = 'pos' | 'backupC' | 'sp' | 'rp' | 'flex' | 'swing';

export interface DesignSlot {
  slotId: string;
  kind: DesignSlotKind;
  position?: TaxonomyPosition;
  preference?: SlotPreference;
}

/** The standard 22-slot design frame (mirrors the identity builder's slot plan). */
export function buildDefaultDesignSlots(): DesignSlot[] {
  return [
    ...HITTER_POSITIONS.map((position) => ({ slotId: position, kind: 'pos' as const, position })),
    { slotId: 'backupC', kind: 'backupC' },
    ...Array.from({ length: 4 }, (_, index) => ({ slotId: `SP${index + 1}`, kind: 'sp' as const })),
    ...Array.from({ length: 4 }, (_, index) => ({ slotId: `RP${index + 1}`, kind: 'rp' as const })),
    ...Array.from({ length: 4 }, (_, index) => ({ slotId: `FLEX${index + 1}`, kind: 'flex' as const })),
    { slotId: 'SWING', kind: 'swing' },
  ];
}

export interface DesignBlocker {
  slotId: string;
  kind: 'no-match' | 'budget';
  message: string;
  /** For no-match: how many candidates exist if the named constraint is relaxed. */
  relaxations?: { withoutShape: number; withoutTags: number };
}

export interface SlotResolution {
  slotId: string;
  playerId: string | null;
  playerName?: string;
  salary: number | null;
  /** The ASKED shape when the slot had one (even on a runner-up match); else the pick's shape. */
  matchedShape: string | null;
  /** True when the ask was satisfied by the classifier's runner-up, not the primary shape (F3). */
  viaRunnerUp: boolean;
  candidateCount: number;
}

export interface DesignFeasibilityResult {
  feasible: boolean;
  totalCost: number;
  budget: number;
  headroom: number;
  legal: boolean;
  slots: SlotResolution[];
  blockers: DesignBlocker[];
}

interface ClassifiedPoolPlayer extends DesignPoolPlayer {
  classification: ShapeClassification;
}

function classifyPool(pool: readonly DesignPoolPlayer[]): ClassifiedPoolPlayer[] {
  return pool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) }));
}

function matchesShape(player: ClassifiedPoolPlayer, preference: SlotPreference): boolean {
  if (!preference.shape) return true;
  if (player.classification.shape === preference.shape) return true;
  const allowRunnerUp = preference.allowRunnerUp ?? true;
  return allowRunnerUp && player.classification.runnerUp === preference.shape;
}

function matchesTags(player: ClassifiedPoolPlayer, preference: SlotPreference): boolean {
  const tags = preference.tags;
  if (!tags) return true;
  const playerTags = player.classification.tags;
  if (tags.bats && playerTags.bats !== tags.bats) return false;
  if (tags.leftArm && !playerTags.leftArm) return false;
  if (tags.utility && playerTags.utility === null) return false;
  if (tags.twoWay && !playerTags.twoWay) return false;
  if (tags.platoonSide && !playerTags.platoonSides.includes(tags.platoonSide)) return false;
  return true;
}

/** Soft ordering penalty (0 best) — a tilt reorders candidates, never removes them. */
export function personalityTiltPenalty(
  group: ShapeClassification['tags']['personalityGroup'],
  tilt: PersonalityTilt | undefined,
): number {
  switch (tilt ?? 'any') {
    case 'any':
      return 0;
    case 'avoid-fragile':
      return group === 'FRAGILE' ? 1 : 0;
    case 'prefer-steady':
      return group === 'STEADY' ? 0 : group === 'FRAGILE' ? 2 : 1;
    case 'embrace-volatility':
      return group === 'VOLATILE' ? 0 : 1;
  }
}

function eligibleForSlot(
  slot: DesignSlot,
  player: ClassifiedPoolPlayer,
  pitchersUsed: number,
): boolean {
  const isPitcher = player.profile.isPitcher;
  const role = player.slotPlayer.role ?? player.profile.primaryPosition;
  switch (slot.kind) {
    case 'pos':
      return !isPitcher && canCover(player.slotPlayer, slot.position as FieldPosition);
    case 'backupC':
      // Covering hitters first-class; a Two Way (C) arm only with staff headroom (F3 rule).
      if (!isPitcher) return canCover(player.slotPlayer, 'C');
      return player.slotPlayer.twoWayVariant === 'C' && pitchersUsed < 9;
    case 'sp':
      return isPitcher && (role === 'SP' || role === 'SP/RP');
    case 'rp':
      return isPitcher && (role === 'RP' || role === 'CP' || role === 'SP/RP');
    case 'flex':
      return !isPitcher;
    case 'swing':
      return !isPitcher || role === 'RP' || role === 'CP' || role === 'SP/RP';
  }
}

function candidateOrder(
  left: ClassifiedPoolPlayer,
  right: ClassifiedPoolPlayer,
  tilt: PersonalityTilt | undefined,
): number {
  const tiltDiff =
    personalityTiltPenalty(left.classification.tags.personalityGroup, tilt)
    - personalityTiltPenalty(right.classification.tags.personalityGroup, tilt);
  if (tiltDiff !== 0) return tiltDiff;
  if (left.salary !== right.salary) return left.salary - right.salary; // cheapest-first: feasibility maximizes leftover budget
  return left.id.localeCompare(right.id);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * The Asst GM's verdict — F1 (Opus audit): feasibility is decided by MAX-CARDINALITY
 * BIPARTITE MATCHING (slots ↔ eligible players, Kuhn's augmenting paths), not a greedy
 * fill — a loose earlier slot can no longer strand a later specific ask by consuming the
 * one player it uniquely needed. Feasible IFF a complete matching exists (then budget +
 * legality). Candidate order within a slot is (tilt, salary), so the matching PREFERS
 * cheap/tilted picks; a post-matching cheapest-swap pass then shrinks cost further (a
 * documented heuristic — exact min-cost assignment is not required for the verdict, only
 * for the estimate). Blockers name the true obstacle for slots left unmatched at maximum.
 * Two-Way(C) staff headroom is enforced by the final isLegalRoster check (the matching
 * itself is headroom-agnostic).
 * SEMANTIC NOTE: under a saturated pool, augmenting may permute WHICH slot holds which
 * eligible player — the engine's promises are the feasibility verdict, the total cost,
 * and tilt-aware candidate ordering, never slot-local cheapest assignment.
 */
export function evaluateRosterDesign(
  slots: readonly DesignSlot[],
  pool: readonly DesignPoolPlayer[],
  budget: number,
): DesignFeasibilityResult {
  const classified = classifyPool(pool);
  const slotList = [...slots];

  // Hard-constraint candidate lists (indices into `classified`), preference-ordered.
  const candidateIdx: number[][] = slotList.map((slot) => {
    const preference = slot.preference ?? {};
    return classified
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => eligibleForSlot(slot, player, 0))
      .filter(({ player }) => matchesShape(player, preference) && matchesTags(player, preference))
      .sort((a, b) => candidateOrder(a.player, b.player, preference.personalityTilt))
      .map(({ index }) => index);
  });

  // Kuhn's maximum matching; most-constrained slots first for fast convergence.
  const slotOfPlayer = new Map<number, number>();
  const playerOfSlot: (number | null)[] = slotList.map(() => null);
  const bySize = slotList.map((_, index) => index).sort(
    (a, b) => candidateIdx[a].length - candidateIdx[b].length,
  );
  const tryAugment = (slotIndex: number, visited: Set<number>): boolean => {
    for (const playerIndex of candidateIdx[slotIndex]) {
      if (visited.has(playerIndex)) continue;
      visited.add(playerIndex);
      const holder = slotOfPlayer.get(playerIndex);
      if (holder === undefined || tryAugment(holder, visited)) {
        slotOfPlayer.set(playerIndex, slotIndex);
        playerOfSlot[slotIndex] = playerIndex;
        return true;
      }
    }
    return false;
  };
  for (const slotIndex of bySize) {
    tryAugment(slotIndex, new Set());
  }

  // Cost-improvement: swap any matched player for a cheaper unmatched candidate of the
  // same slot (repeat until stable) — keeps the budget estimate honest without disturbing
  // the matching's completeness.
  let improved = true;
  while (improved) {
    improved = false;
    for (let slotIndex = 0; slotIndex < slotList.length; slotIndex += 1) {
      const current = playerOfSlot[slotIndex];
      if (current === null) continue;
      for (const candidate of candidateIdx[slotIndex]) {
        if (slotOfPlayer.has(candidate)) continue;
        if (classified[candidate].salary < classified[current].salary) {
          slotOfPlayer.delete(current);
          slotOfPlayer.set(candidate, slotIndex);
          playerOfSlot[slotIndex] = candidate;
          improved = true;
          break;
        }
      }
    }
  }

  const blockers: DesignBlocker[] = [];
  const resolutions: SlotResolution[] = [];
  for (let slotIndex = 0; slotIndex < slotList.length; slotIndex += 1) {
    const slot = slotList[slotIndex];
    const preference = slot.preference ?? {};
    const matchedIndex = playerOfSlot[slotIndex];

    if (matchedIndex === null) {
      const label = slot.position ?? slot.slotId;
      const unmatched = classified.filter((_, index) => !slotOfPlayer.has(index));
      const eligible = unmatched.filter((player) => eligibleForSlot(slot, player, 0));
      const shapeMatched = eligible.filter((player) => matchesShape(player, preference));
      const ask = [preference.shape, preference.tags ? 'your tag filters' : null]
        .filter(Boolean)
        .join(' + ');
      blockers.push({
        slotId: slot.slotId,
        kind: 'no-match',
        message: preference.shape
          ? `No ${preference.shape}${preference.tags ? ' matching your filters' : ''} available for ${label} — `
            + `${eligible.length} eligible players exist ignoring ${ask || 'the ask'}.`
          : `No eligible player left in the pool for ${label}.`,
        relaxations: { withoutShape: eligible.length, withoutTags: shapeMatched.length },
      });
      resolutions.push({
        slotId: slot.slotId,
        playerId: null,
        salary: null,
        matchedShape: null,
        viaRunnerUp: false,
        candidateCount: 0,
      });
      continue;
    }

    const pick = classified[matchedIndex];
    const viaRunnerUp = Boolean(preference.shape) && pick.classification.shape !== preference.shape;
    resolutions.push({
      slotId: slot.slotId,
      playerId: pick.id,
      playerName: pick.name,
      salary: pick.salary,
      // F3: report the ASKED shape on a runner-up match (flagged), never mislabel the board.
      matchedShape: preference.shape ?? pick.classification.shape,
      viaRunnerUp,
      candidateCount: candidateIdx[slotIndex].length,
    });
  }
  const used = new Set(
    resolutions.filter((slot) => slot.playerId !== null).map((slot) => slot.playerId as string),
  );

  const filled = resolutions.filter((slot) => slot.playerId !== null);
  const totalCost = filled.reduce((sum, slot) => sum + (slot.salary ?? 0), 0);

  let legal = false;
  if (blockers.length === 0 && filled.length === slots.length) {
    const roster = classified.filter((player) => used.has(player.id)).map((player) => player.slotPlayer);
    legal = isLegalRoster(roster);
  }

  if (blockers.length === 0 && totalCost > budget) {
    // Name the priciest asks relative to their slot's market so the GM knows where to give.
    const culprits = filled
      .map((slot) => {
        const slotDef = slots.find((candidate) => candidate.slotId === slot.slotId);
        const marketSalaries = classified
          .filter((player) => slotDef && eligibleForSlot(slotDef, player, 0))
          .map((player) => player.salary);
        return { slot, premium: (slot.salary ?? 0) - median(marketSalaries) };
      })
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 3);
    blockers.push({
      slotId: culprits[0]?.slot.slotId ?? 'budget',
      kind: 'budget',
      message: `The design fills, but costs ${Math.round(totalCost).toLocaleString()} against a budget of `
        + `${Math.round(budget).toLocaleString()} (${Math.round(totalCost - budget).toLocaleString()} over). `
        + `Priciest asks vs their market: ${culprits
          .map(({ slot, premium }) => `${slot.slotId} (+${Math.round(Math.max(0, premium)).toLocaleString()})`)
          .join(', ')}.`,
    });
  }

  if (blockers.length === 0 && totalCost <= budget && !legal) {
    blockers.push({
      slotId: 'legality',
      kind: 'no-match',
      message: 'The design fills and fits the budget, but the assembled 22 is not a legal roster '
        + '(most often the pitcher-staff ceiling via a Two-Way arm at backup catcher). '
        + 'Swap one design ask toward the stranded requirement.',
    });
  }

  return {
    feasible: blockers.length === 0 && totalCost <= budget && legal,
    totalCost,
    budget,
    headroom: budget - totalCost,
    legal,
    slots: resolutions,
    blockers,
  };
}

export interface RankedPoolEntry {
  playerId: string;
  playerName?: string;
  salary: number;
  shape: string;
  matchScore: number;
  tiltPenalty: number;
}

/**
 * The per-position pool ranking against a requested archetype (the board's right rail):
 * best expression of the GM's ask first — match quality, then tilt, then price.
 */
export function rankPoolForPreference(
  position: TaxonomyPosition,
  preference: SlotPreference,
  pool: readonly DesignPoolPlayer[],
): RankedPoolEntry[] {
  const slot: DesignSlot = HITTER_POSITIONS.includes(position)
    ? { slotId: position, kind: 'pos', position }
    : { slotId: position, kind: position === 'RP' || position === 'CP' ? 'rp' : 'sp' };
  return classifyPool(pool)
    .filter((player) => eligibleForSlot(slot, player, 0))
    .map((player) => {
      const top = player.classification.shape === preference.shape;
      const runnerUp = player.classification.runnerUp === preference.shape;
      const matchScore = !preference.shape
        ? player.classification.similarity
        : top
          ? player.classification.similarity
          : runnerUp
            ? player.classification.runnerUpSimilarity * 0.9
            : 0;
      return {
        playerId: player.id,
        playerName: player.name,
        salary: player.salary,
        shape: player.classification.shape,
        matchScore,
        tiltPenalty: personalityTiltPenalty(
          player.classification.tags.personalityGroup,
          preference.personalityTilt,
        ),
      };
    })
    .sort((left, right) =>
      right.matchScore - left.matchScore
      || left.tiltPenalty - right.tiltPenalty
      || left.salary - right.salary
      || left.playerId.localeCompare(right.playerId),
    );
}
