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
  canRelieve,
  canStart,
  isLegalRoster,
  LEGAL_ROSTER,
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

export interface ClassifiedDesignPoolPlayer extends DesignPoolPlayer {
  classification: ShapeClassification;
}
type ClassifiedPoolPlayer = ClassifiedDesignPoolPlayer;
export type SlotEligibilityPlayer = {
  profile: Pick<ClassifiableProfile, 'isPitcher' | 'primaryPosition'>;
  slotPlayer: RosterSlotPlayer;
};

function classifyPool(pool: readonly DesignPoolPlayer[]): ClassifiedPoolPlayer[] {
  return pool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) }));
}

export function matchesShape(preference: SlotPreference, classification: ShapeClassification): boolean {
  if (!preference.shape) return true;
  if (classification.shape === preference.shape) return true;
  const allowRunnerUp = preference.allowRunnerUp ?? true;
  return allowRunnerUp && classification.runnerUp === preference.shape;
}

export function matchesTags(preference: SlotPreference, classification: ShapeClassification): boolean {
  const tags = preference.tags;
  if (!tags) return true;
  const playerTags = classification.tags;
  if (tags.bats && playerTags.bats !== tags.bats) return false;
  if (tags.leftArm && !playerTags.leftArm) return false;
  if (tags.utility && playerTags.utility === null) return false;
  if (tags.twoWay && !playerTags.twoWay) return false;
  if (tags.platoonSide && !playerTags.platoonSides.includes(tags.platoonSide)) return false;
  return true;
}

export interface AskSatisfaction {
  shapeMatch: 'none' | 'primary' | 'runnerUp';
  tagsMatched: number;
  tagsAsked: number;
  tiltPenalty: number;
  satisfiesShape: boolean;
  satisfiesTags: boolean;
}

export function askSatisfaction(
  preference: SlotPreference | undefined,
  classification: ShapeClassification,
): AskSatisfaction {
  const ask = preference ?? {};
  let shapeMatch: AskSatisfaction['shapeMatch'] = 'none';
  if (ask.shape && classification.shape === ask.shape) {
    shapeMatch = 'primary';
  } else if (ask.shape && (ask.allowRunnerUp ?? true) && classification.runnerUp === ask.shape) {
    shapeMatch = 'runnerUp';
  }

  const tags = ask.tags;
  let tagsAsked = 0;
  let tagsMatched = 0;
  const countTag = (matched: boolean) => {
    tagsAsked += 1;
    if (matched) tagsMatched += 1;
  };
  if (tags?.bats) countTag(classification.tags.bats === tags.bats);
  if (tags?.leftArm) countTag(classification.tags.leftArm);
  if (tags?.utility) countTag(classification.tags.utility !== null);
  if (tags?.twoWay) countTag(classification.tags.twoWay);
  if (tags?.platoonSide) countTag(classification.tags.platoonSides.includes(tags.platoonSide));

  return {
    shapeMatch,
    tagsMatched,
    tagsAsked,
    tiltPenalty: personalityTiltPenalty(classification.tags.personalityGroup, ask.personalityTilt),
    satisfiesShape: !ask.shape || shapeMatch !== 'none',
    satisfiesTags: tagsMatched === tagsAsked,
  };
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

/**
 * Retry-pass restrictions (see evaluateRosterDesign): the ONLY count-legality hole in the
 * 22-slot frame is BOTH backupC and SWING resolving to arms (10 pitchers > the 8–9 band);
 * when that happens the matching re-runs with one of these tightened.
 */
interface EligibilityRestrictions {
  backupCHittersOnly?: boolean;
  swingHittersOnly?: boolean;
}

function eligibleForSlot(
  slot: DesignSlot,
  player: SlotEligibilityPlayer,
  restrict: EligibilityRestrictions = {},
): boolean {
  const isPitcher = player.profile.isPitcher;
  const role = player.slotPlayer.role ?? player.profile.primaryPosition;
  switch (slot.kind) {
    case 'pos':
      // LEGALITY BY CONSTRUCTION (JK browser bug 2026-07-02): the eight field spots take
      // PRIMARY-position players ONLY — isLegalRoster demands a primary at each spot, and
      // a positional ask means a true player of that position, never a moonlighter
      // covering it via a secondary. (Coverage-based filling assembled illegal 22s out of
      // pools that held legal ones.)
      return !isPitcher && player.slotPlayer.position === slot.position;
    case 'backupC':
      // Covering hitters first-class (secondary-C counts here — the C slot guarantees the
      // primary); a Two Way (C) arm unless the retry pass tightened this slot.
      if (!isPitcher) return canCover(player.slotPlayer, 'C');
      return !restrict.backupCHittersOnly && player.slotPlayer.twoWayVariant === 'C';
    case 'sp':
      return isPitcher && (role === 'SP' || role === 'SP/RP');
    case 'rp':
      return isPitcher && (role === 'RP' || role === 'CP' || role === 'SP/RP');
    case 'flex':
      return !isPitcher;
    case 'swing':
      if (!isPitcher) return true;
      return !restrict.swingHittersOnly && (role === 'RP' || role === 'CP' || role === 'SP/RP');
  }
}

/** Public slot-eligibility door for target-side validators; delegates to the solver's rule. */
export function isDesignPlayerEligibleForSlot(slot: DesignSlot, player: SlotEligibilityPlayer): boolean {
  return eligibleForSlot(slot, player);
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

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Name the ACTUAL legality rule an assembled 22 fails (plain language, ordered by how the
 * checks cascade). By construction the solver should rarely land here — this is the honest
 * fallback, replacing the old canned guess that misdiagnosed real failures (JK 2026-07-02).
 */
function explainIllegality(players: RosterSlotPlayer[]): string {
  if (players.length !== LEGAL_ROSTER.size) {
    return `it counts ${players.length} players, not ${LEGAL_ROSTER.size}`;
  }
  const hitters = players.filter((p) => !p.isPitcher);
  const pitchers = players.filter((p) => p.isPitcher);
  if (pitchers.length > LEGAL_ROSTER.maxPitchers) {
    return `the staff counts ${pitchers.length} arms — the legal band is `
      + `${LEGAL_ROSTER.minPitchers}–${LEGAL_ROSTER.maxPitchers}, so at most one of backup `
      + 'catcher and the swing slot can be an arm';
  }
  if (pitchers.length < LEGAL_ROSTER.minPitchers) {
    return `the staff counts only ${pitchers.length} arms — the legal band is `
      + `${LEGAL_ROSTER.minPitchers}–${LEGAL_ROSTER.maxPitchers}`;
  }
  for (const pos of LEGAL_ROSTER.fieldPositions) {
    if (!hitters.some((p) => p.position === pos)) {
      return `no player whose PRIMARY position is ${pos} made the 22 — a starter at each of `
        + 'the eight spots must be a true player of that position';
    }
  }
  if (players.filter((p) => canCover(p, 'C')).length < LEGAL_ROSTER.minCatchers) {
    return 'catcher depth is short — the roster needs two distinct players who can take C';
  }
  if (pitchers.filter(canStart).length < LEGAL_ROSTER.startingPitchers) {
    return `fewer than ${LEGAL_ROSTER.startingPitchers} startable arms (SP or SP/RP) made the 22`;
  }
  if (pitchers.filter(canRelieve).length < LEGAL_ROSTER.minRelievers) {
    return `fewer than ${LEGAL_ROSTER.minRelievers} relievable arms (RP, CP, or SP/RP) made the 22`;
  }
  return 'a roster-construction rule failed that this reporter does not recognize';
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
 * LEGALITY BY CONSTRUCTION (JK browser bug 2026-07-02): pos-slot eligibility is PRIMARY-
 * position only (isLegalRoster's rule for the starting eight), so a complete matching can
 * no longer assemble an illegal 22 out of cheap moonlighters while a legal fill exists.
 * The one remaining count hole — backupC AND SWING both resolving to arms (10 pitchers) —
 * triggers a tighten-and-retry pass (backupC→hitters, then SWING→hitters). The final
 * isLegalRoster check stays as the invariant gate; if it ever fails, the blocker names the
 * ACTUAL rule via explainIllegality, never a canned guess.
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

  interface Solution {
    candidateIdx: number[][];
    playerOfSlot: (number | null)[];
    slotOfPlayer: Map<number, number>;
    complete: boolean;
    restrict: EligibilityRestrictions;
  }

  const solve = (restrict: EligibilityRestrictions): Solution => {
    // Hard-constraint candidate lists (indices into `classified`), preference-ordered.
    const candidateIdx: number[][] = slotList.map((slot) => {
      const preference = slot.preference ?? {};
      return classified
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => eligibleForSlot(slot, player, restrict))
        .filter(({ player }) => matchesShape(preference, player.classification) && matchesTags(preference, player.classification))
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

    return {
      candidateIdx,
      playerOfSlot,
      slotOfPlayer,
      complete: playerOfSlot.every((pick) => pick !== null),
      restrict,
    };
  };

  // The count-legality retry: a complete fill with arms at BOTH backupC and SWING carries
  // 10 pitchers (illegal); prefer the hitter-tightened variant that still completes.
  const armAt = (solution: Solution, kind: DesignSlotKind): boolean =>
    slotList.some((slot, index) => {
      if (slot.kind !== kind) return false;
      const pick = solution.playerOfSlot[index];
      return pick !== null && classified[pick].profile.isPitcher;
    });
  let solution = solve({});
  if (solution.complete && armAt(solution, 'backupC') && armAt(solution, 'swing')) {
    const backupTightened = solve({ backupCHittersOnly: true });
    if (backupTightened.complete) {
      solution = backupTightened;
    } else {
      const swingTightened = solve({ swingHittersOnly: true });
      if (swingTightened.complete) solution = swingTightened;
    }
  }
  const { candidateIdx, playerOfSlot, slotOfPlayer, restrict } = solution;

  const blockers: DesignBlocker[] = [];
  const resolutions: SlotResolution[] = [];
  for (let slotIndex = 0; slotIndex < slotList.length; slotIndex += 1) {
    const slot = slotList[slotIndex];
    const preference = slot.preference ?? {};
    const matchedIndex = playerOfSlot[slotIndex];

    if (matchedIndex === null) {
      const label = slot.position ?? slot.slotId;
      const unmatched = classified.filter((_, index) => !slotOfPlayer.has(index));
      const eligible = unmatched.filter((player) => eligibleForSlot(slot, player, restrict));
      const shapeMatched = eligible.filter((player) => matchesShape(preference, player.classification));
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
          .filter((player) => slotDef && eligibleForSlot(slotDef, player, restrict))
          .map((player) => player.salary);
        return { slot, premium: (slot.salary ?? 0) - median(marketSalaries) };
      })
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 3);
    blockers.push({
      slotId: culprits[0]?.slot.slotId ?? 'budget',
      kind: 'budget',
      message: `The design fills, but costs ${formatMoney(totalCost)} against a budget of `
        + `${formatMoney(budget)} (${formatMoney(totalCost - budget)} over). `
        + `Priciest asks vs their market: ${culprits
          .map(({ slot, premium }) => `${slot.slotId} (+${formatMoney(Math.max(0, premium))})`)
          .join(', ')}.`,
    });
  }

  if (blockers.length === 0 && totalCost <= budget && !legal) {
    const roster = classified.filter((player) => used.has(player.id)).map((player) => player.slotPlayer);
    blockers.push({
      slotId: 'legality',
      kind: 'no-match',
      message: 'The design fills and fits the budget, but the assembled 22 is not a legal roster: '
        + `${explainIllegality(roster)}. Swap one design ask toward the stranded requirement.`,
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

/**
 * The ONE candidate-count the UI may display for an ask (menu rows, slot badges): the
 * same eligibility + shape/tag matching the solver itself uses, unrestricted. The designer
 * previously kept a private copy of these rules and drifted (coverage vs primary — the JK
 * 2026-07-02 bug lived twice); UI surfaces must count through THIS door, never re-derive.
 */
export function countEligibleForAsk(
  slot: DesignSlot,
  shapeFamily: string | undefined,
  classifiedPool: readonly ClassifiedDesignPoolPlayer[],
): number {
  const preference: SlotPreference = { ...(slot.preference ?? {}), shape: shapeFamily };
  return classifiedPool.filter((player) =>
    eligibleForSlot(slot, player)
    && matchesShape(preference, player.classification)
    && matchesTags(preference, player.classification),
  ).length;
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
 * The per-slot pool ranking against a requested archetype (the board's right rail):
 * best expression of the GM's ask first — match quality, then tilt, then price. Field
 * positions rank TRUE (primary) players only — a moonlighter appears on his own
 * position's list, matching the pos-slot legality semantics.
 */
export function rankPoolForSlot(
  slot: DesignSlot,
  preference: SlotPreference,
  pool: readonly DesignPoolPlayer[],
): RankedPoolEntry[] {
  return classifyPool(pool)
    .filter((player) => eligibleForSlot(slot, player))
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

export function rankPoolForPreference(
  position: TaxonomyPosition,
  preference: SlotPreference,
  pool: readonly DesignPoolPlayer[],
): RankedPoolEntry[] {
  const slot: DesignSlot = HITTER_POSITIONS.includes(position)
    ? { slotId: position, kind: 'pos', position }
    : { slotId: position, kind: position === 'RP' || position === 'CP' ? 'rp' : 'sp' };
  return rankPoolForSlot(slot, preference, pool);
}
