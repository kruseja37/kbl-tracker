/**
 * The ECONOMIC completion floor (SCOUTING_INTELLIGENCE_SPEC §6:186-193; FABLE-C2B, audit AUC-2 /
 * RCI-04; JK 2026-07-01: the old floor "disallows teams to finish the draft every time").
 *
 * Answers the money question `rosterNeed.ts` deliberately left open: "what does it COST to finish
 * a legal roster from the players ACTUALLY LEFT, at their real cheapest prices?" — where the real
 * cheapest price of a remaining player is his opening ask (a lot can never clear below it; the
 * forced-filler and lone-survivor paths both pay exactly it).
 *
 * Design (FABLE_C2B_DESIGN §3 D2): the quote is CONSTRUCTIVE and LAW-VERIFIED, not a claimed
 * optimum. We assemble a cheapest-first completion per requirement class (missing primaries →
 * exact-position cheapest; rotation/bullpen deficits → exact enumeration over the SP/RP swing
 * split, coverage-aware when catcher depth is short — a required Two Way (C) arm can carry the
 * depth itself (C2B-FIX F1); body floors → cheapest eligible; catcher depth → coverage-biased
 * fill with a forced-dedicated-coverer second attempt), then verify the assembled 22 with
 * `isLegalRoster`.
 * A verified completion's cost is an UPPER bound on the true minimum, so the derived bid ceiling
 * can only ever be too SAFE, never too loose — the direction that guarantees draft completion.
 *
 * Everything here is pure and deterministic: candidates are consumed cheapest-first with id
 * tie-breaks, and no caller-supplied ordering survives into the result.
 */

import {
  LEGAL_ROSTER,
  canCover,
  isLegalRoster,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import { rosterNeedBreakdown } from './rosterNeed';

/** A remaining pool player the completion can buy: id + his floor price + his legality shape. */
export interface CompletionCandidate {
  id: string;
  price: number;
  shape: RosterSlotPlayer;
}

export interface CompletionQuote {
  /** False when NO verified-legal completion exists from this pool within the open slots. */
  feasible: boolean;
  /** Total price of the verified completion (0 when openSlots is 0 and the roster is legal). */
  cost: number;
  /** The verified completion's player ids (exactly openSlots entries when feasible). */
  pickIds: readonly string[];
}

const INFEASIBLE: CompletionQuote = { feasible: false, cost: 0, pickIds: [] };

function byPriceThenId(a: CompletionCandidate, b: CompletionCandidate): number {
  return a.price - b.price || a.id.localeCompare(b.id);
}

interface BuildState {
  picks: CompletionCandidate[];
  used: Set<string>;
  hitters: number;
  pitchers: number;
}

function take(state: BuildState, candidate: CompletionCandidate): void {
  state.picks.push(candidate);
  state.used.add(candidate.id);
  if (candidate.shape.isPitcher) state.pitchers += 1;
  else state.hitters += 1;
}

function cheapestWhere(
  pool: readonly CompletionCandidate[],
  state: BuildState,
  predicate: (c: CompletionCandidate) => boolean,
): CompletionCandidate | null {
  for (const candidate of pool) {
    if (state.used.has(candidate.id)) continue;
    if (predicate(candidate)) return candidate;
  }
  return null;
}

function hitterRoomLeft(state: BuildState): boolean {
  return state.hitters < LEGAL_ROSTER.maxPositionPlayers;
}

function pitcherRoomLeft(state: BuildState): boolean {
  return state.pitchers < LEGAL_ROSTER.maxPitchers;
}

/**
 * The exact-minimum arm purchase for the rotation/bullpen deficits, enumerated over BOTH swing
 * dimensions: how many of the ROSTER's SP/RP arms cover rotation vs bullpen, and how many POOL
 * SP/RP arms are bought for each side. Among the splits that need the FEWEST added arms (matching
 * `rosterNeedBreakdown`'s count), the cheapest priced combination wins.
 *
 * COVERAGE-AWARE (C2B-FIX F1, audit C2B F1): when `preferCoverer` is set (the BIASED attempt with
 * catcher depth still short), the same-count enumeration additionally prices every combination
 * that carries at least one `canCover('C')` arm — a Two Way (C) pitcher — by substituting the
 * cheapest coverer of a class into that class's cheapest prefix. If any such combination exists,
 * it wins (the required arm itself carries the catcher coverage, closing the endgame corner where
 * the sole remaining coverage path IS a required rotation/bullpen pick); otherwise the plain
 * cheapest set stands and coverage falls to the later floor/filler bias or the forced-coverer
 * attempt. The arm COUNT is the pass-1 exact minimum either way — never one extra body.
 */
function cheapestArmPicks(
  rosterPitchers: readonly RosterSlotPlayer[],
  pool: readonly CompletionCandidate[],
  state: BuildState,
  preferCoverer: boolean,
): CompletionCandidate[] | null {
  let pureSp = 0;
  let pureRelief = 0;
  let rosterSwing = 0;
  for (const p of rosterPitchers) {
    if (p.role === 'SP') pureSp += 1;
    else if (p.role === 'RP' || p.role === 'CP') pureRelief += 1;
    else if (p.role === 'SP/RP') rosterSwing += 1;
    // Unknown-role arms count toward neither staff minimum (rosterNeed.ts policy, audit F2).
  }

  const poolSp = pool.filter((c) => !state.used.has(c.id) && c.shape.isPitcher && c.shape.role === 'SP');
  const poolPen = pool.filter(
    (c) => !state.used.has(c.id) && c.shape.isPitcher && (c.shape.role === 'RP' || c.shape.role === 'CP'),
  );
  const poolSwing = pool.filter((c) => !state.used.has(c.id) && c.shape.isPitcher && c.shape.role === 'SP/RP');
  const prefix = (list: readonly CompletionCandidate[]): number[] => {
    const sums = [0];
    for (const c of list) sums.push(sums[sums.length - 1] + c.price);
    return sums;
  };
  const spSums = prefix(poolSp);
  const penSums = prefix(poolPen);
  const swingSums = prefix(poolSwing);

  // Coverage-substitution machinery (C2B-FIX F1). For a price-sorted class list, the cheapest
  // k-subset containing ≥1 C-coverer is: the plain k-prefix when a coverer already sits inside
  // it; otherwise the (k−1)-prefix plus the class's CHEAPEST coverer (every coverer then sits at
  // index ≥ k, so any qualifying subset must pay at least that substitution). At arm time the
  // depth shortfall is at most one body (a primary-C always covers), so one coverer suffices.
  const covererIndex = (list: readonly CompletionCandidate[]): number =>
    list.findIndex((c) => canCover(c.shape, 'C'));
  const spCovIdx = covererIndex(poolSp);
  const penCovIdx = covererIndex(poolPen);
  const swingCovIdx = covererIndex(poolSwing);
  const covSum = (
    list: readonly CompletionCandidate[],
    sums: readonly number[],
    covIdx: number,
    k: number,
  ): number => {
    if (k <= 0 || covIdx < 0 || k > list.length) return Number.POSITIVE_INFINITY;
    return covIdx < k ? sums[k] : sums[k - 1] + list[covIdx].price;
  };
  const covSlice = (
    list: readonly CompletionCandidate[],
    covIdx: number,
    k: number,
  ): CompletionCandidate[] =>
    covIdx < k ? list.slice(0, k) : [...list.slice(0, k - 1), list[covIdx]];

  // Pass 1: the fewest arms any roster-swing split needs (the rosterNeedBreakdown count).
  let minCount = Number.POSITIVE_INFINITY;
  for (let x = 0; x <= rosterSwing; x += 1) {
    const rotDef = Math.max(0, LEGAL_ROSTER.startingPitchers - pureSp - x);
    const penDef = Math.max(0, LEGAL_ROSTER.minRelievers - pureRelief - (rosterSwing - x));
    minCount = Math.min(minCount, rotDef + penDef);
  }
  if (minCount === 0) return [];

  // Pass 2: cheapest priced way to buy that count, over every split of pool swings — tracking the
  // plain optimum AND (when preferCoverer) the cheapest same-count combination carrying a coverer.
  type CovClass = 'sp' | 'pen' | 'swing';
  let best: { cost: number; sp: number; pen: number; swing: number } | null = null;
  let bestCov: { cost: number; sp: number; pen: number; swing: number; covClass: CovClass } | null =
    null;
  for (let x = 0; x <= rosterSwing; x += 1) {
    const rotDef = Math.max(0, LEGAL_ROSTER.startingPitchers - pureSp - x);
    const penDef = Math.max(0, LEGAL_ROSTER.minRelievers - pureRelief - (rosterSwing - x));
    if (rotDef + penDef !== minCount) continue;
    for (let sRot = 0; sRot <= Math.min(rotDef, poolSwing.length); sRot += 1) {
      const spNeeded = rotDef - sRot;
      if (spNeeded > poolSp.length) continue;
      for (let sPen = 0; sPen <= Math.min(penDef, poolSwing.length - sRot); sPen += 1) {
        const penNeeded = penDef - sPen;
        if (penNeeded > poolPen.length) continue;
        const swingNeeded = sRot + sPen;
        const cost = spSums[spNeeded] + penSums[penNeeded] + swingSums[swingNeeded];
        if (best === null || cost < best.cost) {
          best = { cost, sp: spNeeded, pen: penNeeded, swing: swingNeeded };
        }
        if (preferCoverer) {
          // One class carries the coverer; the other two stay on their plain prefixes. Fixed
          // class order + strict `<` keeps the choice deterministic at price ties.
          const covOptions: readonly { covClass: CovClass; cost: number }[] = [
            {
              covClass: 'sp',
              cost: covSum(poolSp, spSums, spCovIdx, spNeeded) + penSums[penNeeded] + swingSums[swingNeeded],
            },
            {
              covClass: 'pen',
              cost: spSums[spNeeded] + covSum(poolPen, penSums, penCovIdx, penNeeded) + swingSums[swingNeeded],
            },
            {
              covClass: 'swing',
              cost: spSums[spNeeded] + penSums[penNeeded] + covSum(poolSwing, swingSums, swingCovIdx, swingNeeded),
            },
          ];
          for (const option of covOptions) {
            if (Number.isFinite(option.cost) && (bestCov === null || option.cost < bestCov.cost)) {
              bestCov = { cost: option.cost, sp: spNeeded, pen: penNeeded, swing: swingNeeded, covClass: option.covClass };
            }
          }
        }
      }
    }
  }
  if (preferCoverer && bestCov !== null) {
    return [
      ...(bestCov.covClass === 'sp' ? covSlice(poolSp, spCovIdx, bestCov.sp) : poolSp.slice(0, bestCov.sp)),
      ...(bestCov.covClass === 'pen' ? covSlice(poolPen, penCovIdx, bestCov.pen) : poolPen.slice(0, bestCov.pen)),
      ...(bestCov.covClass === 'swing' ? covSlice(poolSwing, swingCovIdx, bestCov.swing) : poolSwing.slice(0, bestCov.swing)),
    ];
  }
  if (best === null) return null;
  return [
    ...poolSp.slice(0, best.sp),
    ...poolPen.slice(0, best.pen),
    ...poolSwing.slice(0, best.swing),
  ];
}

/**
 * One constructive attempt. `forceDedicatedCoverer` drives the second attempt when the
 * coverage-biased fill could not produce catcher depth 2 (FABLE_C2B_DESIGN §3 D2).
 */
function attemptCompletion(
  roster: readonly RosterSlotPlayer[],
  pool: readonly CompletionCandidate[],
  openSlots: number,
  forceDedicatedCoverer: boolean,
): CompletionQuote {
  const need = rosterNeedBreakdown([...roster]);
  if (need.infeasible || need.minimumAdditions > openSlots) return INFEASIBLE;

  const state: BuildState = {
    picks: [],
    used: new Set<string>(),
    hitters: roster.filter((p) => !p.isPitcher).length,
    pitchers: roster.filter((p) => p.isPitcher).length,
  };
  const coverageMet = () =>
    [...roster, ...state.picks.map((c) => c.shape)].filter((p) => canCover(p, 'C')).length >=
    LEGAL_ROSTER.minCatchers;

  // (a) Missing primaries — exact position, cheapest first; C first so its pick can carry
  // coverage. In the BIASED attempt, while catcher depth is short, prefer a C-covering candidate
  // at each position (a secondary-C fill may be the ONLY coverage path when slots are too tight
  // for a dedicated backup). The FORCED attempt keeps primaries plain-cheapest so the
  // dedicated-coverer route stays price-competitive in the two-attempt min().
  const primaries = [...need.missingPrimaries].sort((l, r) => (l === 'C' ? -1 : r === 'C' ? 1 : l.localeCompare(r)));
  for (const pos of primaries) {
    const atPos = (c: CompletionCandidate) => !c.shape.isPitcher && c.shape.position === pos;
    const pick =
      (!forceDedicatedCoverer && !coverageMet()
        ? cheapestWhere(pool, state, (c) => atPos(c) && canCover(c.shape, 'C'))
        : null) ??
      cheapestWhere(pool, state, atPos);
    if (pick === null || !hitterRoomLeft(state)) return INFEASIBLE;
    take(state, pick);
  }

  // (b) Rotation/bullpen deficits — exact enumeration. In the BIASED attempt, while catcher depth
  // is still short, the enumeration prefers a same-count combination whose required arm ITSELF
  // covers C (a Two Way (C) pick can be the ONLY depth path when slots are too tight for a
  // dedicated coverer body — C2B-FIX F1). The FORCED attempt keeps arms plain-cheapest so the
  // dedicated-coverer route stays price-competitive in the two-attempt min().
  const armPicks = cheapestArmPicks(
    roster.filter((p) => p.isPitcher),
    pool,
    state,
    !forceDedicatedCoverer && !coverageMet(),
  );
  if (armPicks === null) return INFEASIBLE;
  for (const pick of armPicks) {
    if (!pitcherRoomLeft(state)) return INFEASIBLE;
    take(state, pick);
  }

  // (c) Optional forced dedicated C-coverer (attempt 2 only): the cheapest coverer on a side with room.
  if (forceDedicatedCoverer && !coverageMet()) {
    const pick = cheapestWhere(
      pool,
      state,
      (c) =>
        canCover(c.shape, 'C') &&
        (c.shape.isPitcher ? pitcherRoomLeft(state) : hitterRoomLeft(state)),
    );
    if (pick === null) return INFEASIBLE;
    take(state, pick);
  }

  // (d)/(e) Body floors — cheapest eligible, coverage-biased while depth is short.
  const floorFill = (count: number, wantPitcher: boolean): boolean => {
    for (let i = 0; i < count; i += 1) {
      const room = wantPitcher ? pitcherRoomLeft(state) : hitterRoomLeft(state);
      if (!room) return false;
      const side = (c: CompletionCandidate) => c.shape.isPitcher === wantPitcher;
      const pick =
        (!coverageMet() ? cheapestWhere(pool, state, (c) => side(c) && canCover(c.shape, 'C')) : null) ??
        cheapestWhere(pool, state, side);
      if (pick === null) return false;
      take(state, pick);
    }
    return true;
  };
  const hittersAfterPrimaries = roster.filter((p) => !p.isPitcher).length + need.missingPrimaries.length;
  const hitterFloorLeft = Math.max(0, LEGAL_ROSTER.minPositionPlayers - Math.max(hittersAfterPrimaries, state.hitters));
  if (!floorFill(hitterFloorLeft, false)) return INFEASIBLE;
  const pitcherFloorLeft = Math.max(0, LEGAL_ROSTER.minPitchers - state.pitchers);
  if (!floorFill(pitcherFloorLeft, true)) return INFEASIBLE;

  // (f) Fillers to exactly openSlots picks — cheapest eligible within the 13-14 / 8-9 ceilings,
  // still coverage-biased while depth is short.
  while (state.picks.length < openSlots) {
    const eligible = (c: CompletionCandidate) =>
      c.shape.isPitcher ? pitcherRoomLeft(state) : hitterRoomLeft(state);
    const pick =
      (!coverageMet() ? cheapestWhere(pool, state, (c) => eligible(c) && canCover(c.shape, 'C')) : null) ??
      cheapestWhere(pool, state, eligible);
    if (pick === null) return INFEASIBLE;
    take(state, pick);
  }
  if (state.picks.length !== openSlots) return INFEASIBLE;

  // (g) THE LAW verifies the construction — never trust the assembly's own bookkeeping.
  const finalRoster = [...roster, ...state.picks.map((c) => c.shape)];
  if (!isLegalRoster(finalRoster)) return INFEASIBLE;

  return {
    feasible: true,
    cost: state.picks.reduce((sum, c) => sum + c.price, 0),
    pickIds: state.picks.map((c) => c.id),
  };
}

/**
 * The cheapest VERIFIED-legal completion of `roster` to a full 22 using exactly `openSlots`
 * purchases from `pool`. Infeasible when no verified completion exists (the caller decides the
 * fallback policy — the auction falls back to the scalar reserve rather than blocking all bids).
 */
export function cheapestLegalCompletion(
  roster: readonly RosterSlotPlayer[],
  pool: readonly CompletionCandidate[],
  openSlots: number,
): CompletionQuote {
  if (roster.length + openSlots !== LEGAL_ROSTER.size) return INFEASIBLE;
  if (openSlots === 0) {
    return isLegalRoster([...roster]) ? { feasible: true, cost: 0, pickIds: [] } : INFEASIBLE;
  }
  if (pool.length < openSlots) return INFEASIBLE;

  const sorted = [...pool].sort(byPriceThenId);
  const biased = attemptCompletion(roster, sorted, openSlots, false);
  const forced = attemptCompletion(roster, sorted, openSlots, true);
  if (biased.feasible && forced.feasible) return biased.cost <= forced.cost ? biased : forced;
  return biased.feasible ? biased : forced;
}

/**
 * Price-aware CONSERVATIVE reserve for the enriched-but-infeasible fallback (C2B-FIX F1
 * defense-in-depth): the sum of the `slots` cheapest opening asks actually left in the pool.
 * Every future slot must be filled by SOME remaining player at no less than his opening ask, so
 * this is a hard lower bound on ANY completion's cost — position-blind, therefore valid even when
 * the constructive quote above reports infeasible. A ceiling derived from it can be looser than a
 * true completion-based ceiling but is never looser than the prices actually left allow, closing
 * the under-reserve door the bare `(slots−1)×minSalary` scalar left open.
 */
export function conservativePoolReserve(
  pool: readonly CompletionCandidate[],
  slots: number,
): number {
  if (slots <= 0 || pool.length === 0) return 0;
  const prices = pool.map((c) => c.price).sort((a, b) => a - b);
  let sum = 0;
  for (let i = 0; i < Math.min(slots, prices.length); i += 1) sum += prices[i];
  return sum;
}

/**
 * The completion-based bid ceiling: the most a team can pay for `candidatePrice`-priced roster
 * spot such that finishing a LEGAL roster from what remains stays affordable. Returns null when
 * the completion is infeasible (caller falls back to the scalar reserve).
 */
export function completionBidCeiling(
  budgetRemaining: number,
  rosterWithCandidate: readonly RosterSlotPlayer[],
  remainingPool: readonly CompletionCandidate[],
  openSlotsAfterWin: number,
): number | null {
  const quote = cheapestLegalCompletion(rosterWithCandidate, remainingPool, openSlotsAfterWin);
  if (!quote.feasible) return null;
  return Math.max(0, budgetRemaining - quote.cost);
}
