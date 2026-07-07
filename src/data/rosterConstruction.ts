/**
 * Canonical LEGAL SMB4 roster construction — the SINGLE source of truth that the balance simulator,
 * the auction draft, the scout / Assistant-GM draft board, and the in-season roster advisor must ALL
 * build and reason against, so that every "roster" the app produces or prices is one a GM could
 * actually field.
 *
 * Legality semantics per JK Ruling A EXPANDED + RATIFIED (DECISIONS_LOG 2026-07-01):
 *
 * HARD legality (a roster is illegal without ALL of these):
 *   • 22 players; 13–14 position players / 8–9 pitchers (one slot swings bench-bat ↔ 5th reliever)
 *   • the 8 field positions (C, 1B, 2B, 3B, SS, LF, CF, RF) each covered by a position player whose
 *     PRIMARY position matches (primary positions can only be one of the 8)
 *   • CATCHER DEPTH 2: at least two DISTINCT players who can play C — via primary C, secondary C, or
 *     a pitcher with the Two Way (C) trait — at least one of whom is a primary-C position player.
 *     (So one dedicated catcher + a Two Way (C) pitcher is LEGAL — risky, but viable by ruling.)
 *   • ≥4 startable arms (SP or SP/RP), ≥4 relievable arms (RP, CP, or SP/RP), and
 *     at least one true closer (CP). The closer is one of the four relievers, not a
 *     fifth required bullpen arm.
 *
 * SOFT tier (advisor warnings, NEVER a legality block): the veteran depth rule — ≥2 players able to
 * cover EVERY field position, counting secondary positions (exact or the group secondaries IF / OF /
 * IF/OF / 1B/OF) and Two Way pitchers. Surface via `depthReport`; strategy caveat: secondary-position
 * play is ratings-nerfed in game unless the player has the level-3 UTILITY trait.
 *
 * One roster slot swings between a 5th bench bat and a 5th reliever, so a legal roster is either
 * 14 position players + 8 pitchers OR 13 position players + 9 pitchers.
 */

export const LEGAL_ROSTER = {
  size: 22,
  /** The eight defensive spots a legal roster must cover with a primary at each. */
  fieldPositions: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const,
  /** Distinct players able to play C (primary-C, secondary-C, or Two Way (C)); ≥1 must be primary-C. */
  minCatchers: 2,
  startingPitchers: 4,
  minRelievers: 4,
  minClosers: 1,
  maxRelievers: 5,
  minBench: 4,
  maxBench: 5,
  minPositionPlayers: 13,
  maxPositionPlayers: 14,
  minPitchers: 8,
  maxPitchers: 9,
} as const;

export type FieldPosition = (typeof LEGAL_ROSTER.fieldPositions)[number];

/** The Two Way pitcher trait variants (trait engine vocabulary: 'Two Way (IF)' / '(OF)' / '(C)'). */
export type TwoWayVariant = 'IF' | 'OF' | 'C';

const TWO_WAY_TRAIT_TO_VARIANT: Readonly<Record<string, TwoWayVariant>> = {
  'Two Way (IF)': 'IF',
  'Two Way (OF)': 'OF',
  'Two Way (C)': 'C',
};

/** Derive a pitcher's Two Way variant from their trait strings (null when they have none). */
export function twoWayVariantFromTraits(traits: readonly (string | undefined | null)[]): TwoWayVariant | null {
  for (const t of traits) {
    if (t && TWO_WAY_TRAIT_TO_VARIANT[t] !== undefined) return TWO_WAY_TRAIT_TO_VARIANT[t];
  }
  return null;
}

const IF_POSITIONS: readonly string[] = ['1B', '2B', '3B', 'SS'];
const OF_POSITIONS: readonly string[] = ['LF', 'CF', 'RF'];

/**
 * Minimal player shape the legality rules need; the app's richer player types all satisfy it.
 * `position` = the PRIMARY position (for pitchers this is their role-ish label and is not used for
 * field coverage). `secondaryPosition` may be an exact field position or a group secondary
 * ('IF' | 'OF' | 'IF/OF' | '1B/OF'); groups never cover C. `twoWayVariant` applies to pitchers only.
 */
export interface RosterSlotPlayer {
  isPitcher: boolean;
  position: string;
  role?: string;
  secondaryPosition?: string | null;
  twoWayVariant?: TwoWayVariant | null;
}

/** A pitcher who can take a rotation (SP) slot — a pure starter or a starter/reliever swing. */
export function canStart(p: RosterSlotPlayer): boolean {
  return p.isPitcher && (p.role === 'SP' || p.role === 'SP/RP');
}

/** A pitcher who can take a bullpen slot — a reliever, closer, or a starter/reliever swing. */
export function canRelieve(p: RosterSlotPlayer): boolean {
  return p.isPitcher && (p.role === 'RP' || p.role === 'CP' || p.role === 'SP/RP');
}

/** A true closer. RP and SP/RP never satisfy the dedicated closer requirement. */
export function isCloser(p: RosterSlotPlayer): boolean {
  return p.isPitcher && p.role === 'CP';
}

/** Does a secondary-position value (exact or group) cover a field position? Groups never cover C. */
function secondaryCovers(secondary: string, pos: FieldPosition): boolean {
  if (secondary === pos) return true;
  if (secondary === 'IF') return IF_POSITIONS.includes(pos);
  if (secondary === 'OF') return OF_POSITIONS.includes(pos);
  if (secondary === 'IF/OF') return IF_POSITIONS.includes(pos) || OF_POSITIONS.includes(pos);
  if (secondary === '1B/OF') return pos === '1B' || OF_POSITIONS.includes(pos);
  return false;
}

/**
 * Can this player COVER a field position at all (legality/coverage counting, not quality)?
 * Position players: primary match, or secondary coverage (exact / group). Pitchers: only via their
 * Two Way variant — (C) covers C, (IF) covers the four infield spots, (OF) the three outfield spots.
 */
export function canCover(p: RosterSlotPlayer, pos: FieldPosition): boolean {
  if (p.isPitcher) {
    const v = p.twoWayVariant ?? null;
    if (v === 'C') return pos === 'C';
    if (v === 'IF') return IF_POSITIONS.includes(pos);
    if (v === 'OF') return OF_POSITIONS.includes(pos);
    return false;
  }
  if (p.position === pos) return true;
  const sec = p.secondaryPosition;
  return typeof sec === 'string' && sec !== '' ? secondaryCovers(sec, pos) : false;
}

/**
 * True iff `players` form a LEGAL roster per `LEGAL_ROSTER` and the ratified Ruling A semantics:
 * exactly 22, within the 13–14 position / 8–9 pitcher flex, a PRIMARY at each of the eight field
 * spots, catcher depth 2 (distinct C-coverers incl. secondary-C and Two Way (C), ≥1 primary-C),
 * at least four startable + four relievable arms, and at least one true closer (CP). Used as the
 * gate that makes downstream value/price results translate to a real auction draft rather than to
 * impossible teams.
 */
export function isLegalRoster(players: RosterSlotPlayer[]): boolean {
  if (players.length !== LEGAL_ROSTER.size) return false;

  const hitters = players.filter((p) => !p.isPitcher);
  const pitchers = players.filter((p) => p.isPitcher);
  if (hitters.length < LEGAL_ROSTER.minPositionPlayers || hitters.length > LEGAL_ROSTER.maxPositionPlayers) return false;
  if (pitchers.length < LEGAL_ROSTER.minPitchers || pitchers.length > LEGAL_ROSTER.maxPitchers) return false;

  // The eight field spots need a PRIMARY each (ratified: the starting eight stay primary-only).
  for (const pos of LEGAL_ROSTER.fieldPositions) {
    if (!hitters.some((p) => p.position === pos)) return false;
  }

  // Catcher depth: ≥2 DISTINCT players who can cover C (the required primary-C counts as one).
  if (players.filter((p) => canCover(p, 'C')).length < LEGAL_ROSTER.minCatchers) return false;

  return (
    pitchers.filter(canStart).length >= LEGAL_ROSTER.startingPitchers &&
    pitchers.filter(canRelieve).length >= LEGAL_ROSTER.minRelievers &&
    pitchers.filter(isCloser).length >= LEGAL_ROSTER.minClosers
  );
}

/** Per-position coverage depth for the SOFT advisor tier (never a legality gate). */
export interface PositionDepth {
  position: FieldPosition;
  /** Distinct players (incl. pitchers via Two Way) who can cover the position. */
  coverers: number;
  /** The veteran depth rule: fewer than two coverers = an injury/fatigue risk flag. */
  thin: boolean;
}

export interface RosterDepthReport {
  positions: PositionDepth[];
  thinPositions: FieldPosition[];
}

/**
 * The veteran depth-2-everywhere heuristic (JK 2026-07-01: SOFT tier — the advisor warns with the
 * secondary-play ratings-nerf caveat; it never blocks). Counts primary + secondary (exact and group)
 * coverage plus Two Way pitchers, per field position.
 */
export function depthReport(players: RosterSlotPlayer[]): RosterDepthReport {
  const positions = LEGAL_ROSTER.fieldPositions.map((position) => {
    const coverers = players.filter((p) => canCover(p, position)).length;
    return { position, coverers, thin: coverers < 2 };
  });
  return { positions, thinPositions: positions.filter((d) => d.thin).map((d) => d.position) };
}
