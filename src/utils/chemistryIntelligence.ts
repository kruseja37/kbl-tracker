/**
 * CHEM-POTENCY consumer adapters (JK ruling 4, 2026-07-02; design:
 * spec-docs/FABLE_CHEM_POTENCY_DESIGN_2026-07-02.md §4).
 *
 * One thin seam from the league-builder/franchise Player shape onto the shared chemistry
 * tipping-premium engine (chemistryTierValue). Consumers and their tickets:
 *  - AUCTION ADVICE (C4-B renders it): `chemistryAdviceForCandidate(lotPlayer, teamRosterPlayers)`
 *    — the "worth to YOU" premium beside the market read. Advice-only: the market-price
 *    prediction, CPU/shill bidding, and every economy number stay chemistry-free at L2.
 *  - IN-SEASON ANALYZER (wired after CODEX-ASSTGM-LEGALITY lands — same-file collision
 *    avoidance): `chemistryAdviceForCandidate` for call-ups, `chemistryRemovalAdvice` for
 *    send-downs (the call-up-replacement ripple the research spec flagged as unmodeled).
 *  - PRE-DRAFT / POOL PANELS: `chemistryProfileForPlayers` — family counts, tiers,
 *    distance-to-next-tier, trait supply.
 *
 * Privacy: these functions read chemistry + traits + ratings only — never personality and
 * never hiddenPersonalityModifiers, so the ruling-5 boundary holds by construction.
 */

import {
  chemistryRemovalImpact,
  chemistryTipPremium,
  rosterChemistryProfile,
  type ChemistryContextPlayer,
  type ChemistryRemovalBreakdown,
  type ChemistryTipBreakdown,
  type FamilyChemistryProfile,
} from '../engines/chemistryTierValue';
import type { IVPlayerInput } from '../engines/ivEngine';
import type { Player } from './leagueBuilderStorage';

const HITTER_POSITIONS = new Set([
  'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH',
]);

function chemistryIvInput(player: Player): IVPlayerInput {
  const isPitcher = player.primaryPosition === 'SP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
    || player.primaryPosition === 'SP/RP'
    || player.primaryPosition === 'P';
  const pitcherRole = player.primaryPosition === 'SP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
    || player.primaryPosition === 'SP/RP'
    ? player.primaryPosition
    : 'SP';
  const secondaryPosition = player.secondaryPosition && (
    HITTER_POSITIONS.has(player.secondaryPosition)
      || player.secondaryPosition === 'SP'
      || player.secondaryPosition === 'RP'
      || player.secondaryPosition === 'CP'
      || player.secondaryPosition === 'SP/RP'
  )
    ? player.secondaryPosition
    : player.secondaryPosition
      ? 'UTIL'
      : undefined;

  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`.trim(),
    isPitcher,
    bats: player.bats,
    primaryPosition: isPitcher
      ? undefined
      : HITTER_POSITIONS.has(player.primaryPosition)
        ? player.primaryPosition
        : 'IF/OF',
    secondaryPosition,
    pitcherRole: isPitcher ? pitcherRole : undefined,
    batterRatings: {
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
    },
    pitcherRatings: isPitcher
      ? { velocity: player.velocity, junk: player.junk, accuracy: player.accuracy }
      : undefined,
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: player.arsenal,
    armSlot: player.armSlot ?? null,
  };
}

export function toChemistryContextPlayer(player: Player): ChemistryContextPlayer {
  return {
    chemistry: player.chemistry,
    traits: [player.trait1, player.trait2].filter(
      (trait): trait is string => typeof trait === 'string' && trait.length > 0,
    ),
    iv: chemistryIvInput(player),
  };
}

/**
 * The tipping premium of adding `candidate` to a roster (dollars, IV currency).
 * `rosterPlayers` must EXCLUDE the candidate; pass the players the team actually holds
 * (auction: the team's won lots joined by playerId; analyzer: the MLB roster).
 */
export function chemistryAdviceForCandidate(
  candidate: Player,
  rosterPlayers: readonly Player[],
): ChemistryTipBreakdown {
  return chemistryTipPremium(
    toChemistryContextPlayer(candidate),
    rosterPlayers.map(toChemistryContextPlayer),
  );
}

/**
 * The team-side cost of removing `departing` (send-down / call-up replacement ripple).
 * `rosterPlayers` must INCLUDE the departing player.
 */
export function chemistryRemovalAdvice(
  departing: Player,
  rosterPlayers: readonly Player[],
): ChemistryRemovalBreakdown {
  const roster = rosterPlayers.map(toChemistryContextPlayer);
  const index = rosterPlayers.findIndex((player) => player.id === departing.id);
  const departingContext = index >= 0 ? roster[index] : toChemistryContextPlayer(departing);
  return chemistryRemovalImpact(departingContext, roster);
}

/** Per-family chemistry summary for a set of players (a roster or a whole pool). */
export function chemistryProfileForPlayers(
  players: readonly Player[],
): FamilyChemistryProfile[] {
  return rosterChemistryProfile(players.map(toChemistryContextPlayer));
}
