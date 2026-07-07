/**
 * Position-aware roster NEED model (SCOUTING_INTELLIGENCE_SPEC §5 own_need; FABLE-C1, audit RCI-01).
 *
 * Replaces the flat "22 − drafted" scalar as the auction's roster AUTHORITY with a per-requirement
 * view derived from the canonical legality module (`rosterConstruction.ts` — single source of truth,
 * audit RCI-02). Everything here is a PURE, DETERMINISTIC function of (roster ids, position info):
 * nothing is persisted, so crash-saved auction sessions stay valid and old sessions simply fall back
 * to the scalar behavior when position info is absent.
 *
 * The core question this module answers is the LEGALITY floor: "what is the MINIMUM number of
 * additional players this team still needs to reach a legal 22?" — and its bid-time contrapositive
 * `wouldStrandRoster`: "if this team wins THIS player, can it still complete a legal roster with the
 * slots it has left?" (the position-aware forced-filler; audit RCI-01's missing guard). The ECONOMIC
 * completion floor (cheapest players actually left per position) is C2B scope — not built here.
 *
 * Uncertainty policy (documented, deliberate): a wrong REJECTION in a live auction is worse than a
 * missed guard, so a player whose position info is entirely MISSING disables the strand check for
 * that team (permissive fallback = the pre-C1 behavior). A KNOWN pitcher with an unknown ROLE
 * ('P' / 'TWO-WAY') is different (audit F2): `isLegalRoster` credits rotation/bullpen minimums only
 * to explicit SP/RP/CP/SP-RP roles, so the need math counts such arms toward pitcher headcount but
 * toward NEITHER staff minimum — matching the law exactly rather than guessing flexibly.
 */

import {
  LEGAL_ROSTER,
  canCover,
  isCloser,
  type FieldPosition,
  type RosterSlotPlayer,
  twoWayVariantFromTraits,
} from '../data/rosterConstruction';

/** Position info per playerId, derivable from any pool/player source. Values are legality shapes. */
export type RosterPositionMap = Readonly<Record<string, RosterSlotPlayer>>;

/** Pitcher primary-position labels as stored on league-builder players (role doubles as primary). */
const PITCHER_PRIMARIES: readonly string[] = ['P', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY'];

/** Minimal source shape for building position info from a rich stored player record. */
export interface PositionInfoSource {
  primaryPosition: string;
  secondaryPosition?: string | null;
  /** Trait strings (e.g. 'Two Way (C)') — only the Two Way variants matter here. */
  traits?: readonly (string | undefined | null)[];
}

/** Map a stored player record to the legality shape (`RosterSlotPlayer`). */
export function toRosterSlotPlayer(source: PositionInfoSource): RosterSlotPlayer {
  const isPitcher = PITCHER_PRIMARIES.includes(source.primaryPosition);
  if (!isPitcher) {
    return {
      isPitcher: false,
      position: source.primaryPosition,
      secondaryPosition: source.secondaryPosition ?? null,
    };
  }
  const role =
    source.primaryPosition === 'SP' ||
    source.primaryPosition === 'RP' ||
    source.primaryPosition === 'CP' ||
    source.primaryPosition === 'SP/RP'
      ? source.primaryPosition
      : undefined;
  return {
    isPitcher: true,
    position: source.primaryPosition,
    role,
    twoWayVariant: twoWayVariantFromTraits(source.traits ?? []),
  };
}

/** The remaining hard requirements between a partial roster and a legal 22. */
export interface RosterNeedBreakdown {
  /** Field positions still missing a PRIMARY position player (0/1 each). */
  missingPrimaries: FieldPosition[];
  /** Additional distinct C-coverers needed beyond the mandated primary-C(s). */
  catcherCoverNeed: number;
  /** Additional startable + relievable arms needed (after optimally assigning SP/RP swings). */
  pitcherNeed: number;
  /**
   * Rotation-side class deficit BEFORE swing allocation: `max(0, 4 − pure-SP count)` (C2B-FIX F2,
   * additive). With `f = pitcherNeed = max(0, rotationDeficit + bullpenDeficit − swings)`, adding a
   * pure SP strictly reduces `pitcherNeed` iff `pitcherNeed > 0 && rotationDeficit > 0`; a swing
   * (SP/RP) reduces it iff `pitcherNeed > 0`. This is the class-aware "fills the arm requirement"
   * read — a pure SP never fills a bullpen-only deficit.
   */
  rotationDeficit: number;
  /** Bullpen-side class deficit BEFORE swing allocation: `max(0, 4 − pure-RP/CP count)` (C2B-FIX F2). */
  bullpenDeficit: number;
  /** Dedicated closer deficit: `max(0, 1 − CP count)`. CP satisfies this and a relief slot. */
  closerDeficit: number;
  /** Additional position players needed to reach the 13 floor beyond the primary fills. */
  hitterFloorNeed: number;
  /** Additional pitchers needed to reach the 8 floor beyond the rotation/bullpen fills. */
  pitcherFloorNeed: number;
  /** Total minimum additional players needed to reach a legal 22. */
  minimumAdditions: number;
  /** True when NO completion to a legal 22 exists (a ceiling is already breached). */
  infeasible: boolean;
}

/** Pure-class arm counts (shared by the need math and the F2 class-deficit exposure). */
function classifyArms(pitchers: readonly RosterSlotPlayer[]): {
  pureSp: number;
  pureRelief: number;
  closers: number;
  swing: number;
} {
  let pureSp = 0;
  let pureRelief = 0;
  let closers = 0;
  let swing = 0;
  for (const p of pitchers) {
    if (p.role === 'SP') pureSp += 1;
    else if (p.role === 'RP' || p.role === 'CP') {
      pureRelief += 1;
      if (isCloser(p)) closers += 1;
    }
    else if (p.role === 'SP/RP') swing += 1;
    // Unknown-role pitchers are INVALID data (JK ruling 2026-07-01: pitcher primaries are exactly
    // SP/SP-RP/RP/CP; two-way is a TRAIT on a normal pitcher primary — a well-formed Two Way (C)
    // arm counts toward its staff minimum via its role AND toward catcher depth via canCover).
    // Defensively, a bare 'P'/'TWO-WAY' primary counts toward pitcher HEADCOUNT only, matching
    // `isLegalRoster` exactly (audit F2). Upstream purge of the invalid states is a Wave-1 ticket.
  }
  return { pureSp, pureRelief, closers, swing };
}

function pitcherAdditionsNeeded(pitchers: RosterSlotPlayer[]): number {
  const { pureSp, pureRelief, closers, swing } = classifyArms(pitchers);
  const closerDeficit = Math.max(0, LEGAL_ROSTER.minClosers - closers);
  let best = Number.POSITIVE_INFINITY;
  for (let x = 0; x <= swing; x += 1) {
    const rotDeficit = Math.max(0, LEGAL_ROSTER.startingPitchers - pureSp - x);
    const penDeficit = Math.max(0, LEGAL_ROSTER.minRelievers - pureRelief - (swing - x));
    best = Math.min(best, rotDeficit + closerDeficit + Math.max(0, penDeficit - closerDeficit));
  }
  return Number.isFinite(best)
    ? best
    : LEGAL_ROSTER.startingPitchers + LEGAL_ROSTER.minRelievers + LEGAL_ROSTER.minClosers;
}

/**
 * The minimum number of additional players a partial roster needs to become a legal 22 — or that no
 * completion exists at all. Pure function of the resolved roster shapes.
 */
export function rosterNeedBreakdown(roster: RosterSlotPlayer[]): RosterNeedBreakdown {
  const hitters = roster.filter((p) => !p.isPitcher);
  const pitchers = roster.filter((p) => p.isPitcher);

  // Ceiling breaches make a legal completion impossible no matter what gets added.
  let infeasible =
    hitters.length > LEGAL_ROSTER.maxPositionPlayers ||
    pitchers.length > LEGAL_ROSTER.maxPitchers ||
    roster.length > LEGAL_ROSTER.size;

  const missingPrimaries = LEGAL_ROSTER.fieldPositions.filter(
    (pos) => !hitters.some((p) => p.position === pos),
  );
  const primaryFills = missingPrimaries.length;

  // Catcher depth: the mandated primary-C fill (if C is missing) will also cover one coverage unit.
  const coverers = roster.filter((p) => canCover(p, 'C')).length;
  const mandatedCFill = missingPrimaries.includes('C') ? 1 : 0;
  const catcherCoverNeed = Math.max(0, LEGAL_ROSTER.minCatchers - coverers - mandatedCFill);

  const pitcherNeed = pitcherAdditionsNeeded(pitchers);
  const armClasses = classifyArms(pitchers);
  const rotationDeficit = Math.max(0, LEGAL_ROSTER.startingPitchers - armClasses.pureSp);
  const bullpenDeficit = Math.max(0, LEGAL_ROSTER.minRelievers - armClasses.pureRelief);
  const closerDeficit = Math.max(0, LEGAL_ROSTER.minClosers - armClasses.closers);

  const hittersAfterPrimaries = hitters.length + primaryFills;
  const pitchersAfterFills = pitchers.length + pitcherNeed;
  if (hittersAfterPrimaries > LEGAL_ROSTER.maxPositionPlayers) infeasible = true;
  if (pitchersAfterFills > LEGAL_ROSTER.maxPitchers) infeasible = true;

  const hitterFloorNeed = Math.max(0, LEGAL_ROSTER.minPositionPlayers - hittersAfterPrimaries);
  const pitcherFloorNeed = Math.max(0, LEGAL_ROSTER.minPitchers - pitchersAfterFills);

  // Coverage SHARING (permissive by policy): the extra C-coverer need not be a dedicated body — any
  // other required addition can carry it (a floor/primary hitter whose SECONDARY is C, or a required
  // arm with Two Way (C)). Only coverage demand beyond every other addition needs its own body; the
  // legality floor deliberately does not assume pool composition either way (the pool-aware economic
  // floor is C2B scope).
  const shareableAdditions = primaryFills - mandatedCFill + pitcherNeed + hitterFloorNeed + pitcherFloorNeed;
  const coverBodies = Math.max(0, catcherCoverNeed - Math.max(0, shareableAdditions));

  // A dedicated C-coverer can sit on either side (secondary-C hitter or Two Way (C) pitcher);
  // it is infeasible only when NEITHER side has headroom left for it.
  if (coverBodies > 0) {
    const hitterHeadroom = LEGAL_ROSTER.maxPositionPlayers - (hittersAfterPrimaries + hitterFloorNeed);
    const pitcherHeadroom = LEGAL_ROSTER.maxPitchers - (pitchersAfterFills + pitcherFloorNeed);
    if (hitterHeadroom + pitcherHeadroom < coverBodies) infeasible = true;
  }

  const minimumAdditions =
    primaryFills + coverBodies + pitcherNeed + hitterFloorNeed + pitcherFloorNeed;

  if (roster.length + minimumAdditions > LEGAL_ROSTER.size) infeasible = true;

  return {
    missingPrimaries,
    catcherCoverNeed,
    pitcherNeed,
    rotationDeficit,
    bullpenDeficit,
    closerDeficit,
    hitterFloorNeed,
    pitcherFloorNeed,
    minimumAdditions,
    infeasible,
  };
}

/** Resolve roster ids through the position map; a single miss disables strict checking. */
function resolveRoster(
  rosterIds: readonly string[],
  positions: RosterPositionMap,
): RosterSlotPlayer[] | null {
  const resolved: RosterSlotPlayer[] = [];
  for (const id of rosterIds) {
    const info = positions[id];
    if (!info) return null; // permissive fallback — see the module-header uncertainty policy
    resolved.push(info);
  }
  return resolved;
}

/**
 * The position-aware forced-filler guard (bid-time): true iff winning `candidateId` would leave the
 * team UNABLE to complete a legal roster within its remaining slots — i.e. the bid strands them.
 * Returns false (never blocks) whenever any position info is missing.
 */
export function wouldStrandRoster(
  rosterIds: readonly string[],
  candidateId: string,
  positions: RosterPositionMap,
): boolean {
  const after = resolveRoster([...rosterIds, candidateId], positions);
  if (after === null) return false;
  if (after.length > LEGAL_ROSTER.size) return true;

  const need = rosterNeedBreakdown(after);
  if (need.infeasible) return true;
  const openSlots = LEGAL_ROSTER.size - after.length;
  return need.minimumAdditions > openSlots;
}

/**
 * The team's remaining hard requirements, resolved through the position map (the own_need read used
 * by valuation/UI consumers; C2B's needMultiplier builds on this). Null when info is incomplete.
 */
export function teamRosterNeed(
  rosterIds: readonly string[],
  positions: RosterPositionMap,
): RosterNeedBreakdown | null {
  const roster = resolveRoster(rosterIds, positions);
  return roster === null ? null : rosterNeedBreakdown(roster);
}

/**
 * Does this player shape satisfy any of the team's outstanding HARD requirements? (Moved here
 * from the market model in FABLE-C3 — pure need-domain logic, shared by the market's own_need
 * multiplier and the CPU bidder's need-aware endgame override.) Class-aware per the C2B-fix F2
 * semantics: an off-role arm never claims a rotation/bullpen deficit it cannot fill.
 */
export function playerFillsHardRequirement(
  shape: RosterSlotPlayer,
  need: RosterNeedBreakdown,
): boolean {
  if (!shape.isPitcher) {
    if (need.missingPrimaries.some((pos) => shape.position === pos)) return true;
    if (need.hitterFloorNeed > 0) return true;
  } else {
    const generalReliefDeficit = Math.max(0, need.bullpenDeficit - need.closerDeficit);
    if (shape.role === 'CP' && need.closerDeficit > 0) return true;
    if (need.pitcherNeed > 0) {
      if (shape.role === 'SP/RP' && (need.rotationDeficit > 0 || generalReliefDeficit > 0)) return true;
      if (shape.role === 'SP' && need.rotationDeficit > 0) return true;
      if (shape.role === 'RP' && generalReliefDeficit > 0) return true;
      if (shape.role === 'CP' && need.bullpenDeficit > 0) return true;
    }
    if (need.pitcherFloorNeed > 0) return true;
  }
  return need.catcherCoverNeed > 0 && canCover(shape, 'C');
}
