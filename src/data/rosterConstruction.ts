/**
 * Canonical LEGAL SMB4 roster construction (JK-confirmed 2026-06-30) — the SINGLE source of truth that
 * the balance simulator, the auction draft, the scout / Assistant-GM draft board, and the in-season
 * roster advisor must ALL build and reason against, so that every "roster" the app produces or prices is
 * one a GM could actually field. (The auction currently enforces only a flat 22-slot count and the
 * position-aware need model is spec'd-but-unbuilt — see SCOUTING_INTELLIGENCE_SPEC §5; those consumers
 * adopt this module as they are wired up.)
 *
 * 22 players:
 *   • 8 field starters — one each of C, 1B, 2B, 3B, SS, LF, CF, RF (by PRIMARY position)
 *   • 1 REQUIRED backup catcher (a second primary-C — the most load-bearing bench slot)
 *   • bench position players — 4 to 5 (the bench may flex DOWN to 4; 4 is a MINIMUM, not a cap)
 *   • 4 starting pitchers (SP, or an SP/RP swing)
 *   • relievers — 4 to 5 (RP/CP, or an SP/RP swing; may flex UP to 5; 4 is a MINIMUM, not a cap)
 *
 * One roster slot swings between a 5th bench bat and a 5th reliever, so a legal roster is either
 * 14 position players + 8 pitchers OR 13 position players + 9 pitchers. Bench-min (4) and reliever-min
 * (4) are minimums; the starting eight, the backup C, and the four starters are hard requirements.
 */
export const LEGAL_ROSTER = {
  size: 22,
  /** The eight defensive spots a legal roster must cover with a primary at each. */
  fieldPositions: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const,
  /** Starter + the required backup catcher. */
  minCatchers: 2,
  startingPitchers: 4,
  minRelievers: 4,
  maxRelievers: 5,
  minBench: 4,
  maxBench: 5,
  minPositionPlayers: 13,
  maxPositionPlayers: 14,
  minPitchers: 8,
  maxPitchers: 9,
} as const;

/** Minimal player shape the legality rules need; the app's richer player types all satisfy it. */
export interface RosterSlotPlayer {
  isPitcher: boolean;
  position: string;
  role?: string;
}

/** A pitcher who can take a rotation (SP) slot — a pure starter or a starter/reliever swing. */
export function canStart(p: RosterSlotPlayer): boolean {
  return p.isPitcher && (p.role === 'SP' || p.role === 'SP/RP');
}

/** A pitcher who can take a bullpen slot — a reliever, closer, or a starter/reliever swing. */
export function canRelieve(p: RosterSlotPlayer): boolean {
  return p.isPitcher && (p.role === 'RP' || p.role === 'CP' || p.role === 'SP/RP');
}

/**
 * True iff `players` form a LEGAL roster per `LEGAL_ROSTER`: exactly 22, within the 13–14 position /
 * 8–9 pitcher flex, two catchers, a primary at each of the seven other field spots, and at least four
 * startable + four relievable arms. Used as the gate that makes downstream value/price results translate
 * to a real auction draft rather than to impossible teams.
 */
export function isLegalRoster(players: RosterSlotPlayer[]): boolean {
  if (players.length !== LEGAL_ROSTER.size) return false;

  const hitters = players.filter((p) => !p.isPitcher);
  const pitchers = players.filter((p) => p.isPitcher);
  if (hitters.length < LEGAL_ROSTER.minPositionPlayers || hitters.length > LEGAL_ROSTER.maxPositionPlayers) return false;
  if (pitchers.length < LEGAL_ROSTER.minPitchers || pitchers.length > LEGAL_ROSTER.maxPitchers) return false;

  if (hitters.filter((p) => p.position === 'C').length < LEGAL_ROSTER.minCatchers) return false;
  for (const pos of LEGAL_ROSTER.fieldPositions) {
    if (pos === 'C') continue; // covered by minCatchers
    if (!hitters.some((p) => p.position === pos)) return false;
  }

  return (
    pitchers.filter(canStart).length >= LEGAL_ROSTER.startingPitchers &&
    pitchers.filter(canRelieve).length >= LEGAL_ROSTER.minRelievers
  );
}
